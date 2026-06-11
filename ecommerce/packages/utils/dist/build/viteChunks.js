const NODE_MODULES_SEGMENT = '/node_modules/';
const DEFAULT_VENDOR_CHUNK = 'vendor';
export function getNodeModulePackageName(id) {
    const normalizedId = id.replaceAll('\\', '/');
    const nodeModulesIndex = normalizedId.lastIndexOf(NODE_MODULES_SEGMENT);
    if (nodeModulesIndex === -1) {
        return undefined;
    }
    const packagePath = normalizedId.slice(nodeModulesIndex + NODE_MODULES_SEGMENT.length);
    if (!packagePath) {
        return undefined;
    }
    const [scopeOrName, packageName] = packagePath.split('/');
    if (!scopeOrName) {
        return undefined;
    }
    if (scopeOrName.startsWith('@')) {
        return packageName ? `${scopeOrName}/${packageName}` : undefined;
    }
    return scopeOrName;
}
function matchesPackagePattern(packageName, pattern) {
    if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -2);
        return packageName === prefix || packageName.startsWith(`${prefix}/`);
    }
    return packageName === pattern;
}
export function createVendorManualChunks(groups) {
    const entries = Object.entries(groups);
    return (id) => {
        const packageName = getNodeModulePackageName(id);
        if (!packageName) {
            return undefined;
        }
        for (const [chunkName, patterns] of entries) {
            if (patterns.some((pattern) => matchesPackagePattern(packageName, pattern))) {
                return chunkName;
            }
        }
        return DEFAULT_VENDOR_CHUNK;
    };
}
