import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../config/env.js';
const openApiSpec = swaggerJsdoc({
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'NJ Store API',
            version: '1.0.0',
            description: 'OpenAPI documentation for the NJ Store backend.'
        },
        servers: [
            {
                url: '/api/v1',
                description: 'Current environment'
            },
            {
                url: `http://localhost:${env.PORT}/api/v1`,
                description: 'Local development'
            }
        ],
        tags: [
            {
                name: 'System',
                description: 'Operational and diagnostic endpoints'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                HealthResponse: {
                    type: 'object',
                    required: ['success', 'data'],
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        data: {
                            type: 'object',
                            required: ['status', 'uptime', 'environment'],
                            properties: {
                                status: {
                                    type: 'string',
                                    example: 'ok'
                                },
                                uptime: {
                                    type: 'number',
                                    format: 'float',
                                    example: 123.45
                                },
                                environment: {
                                    type: 'string',
                                    example: 'development'
                                },
                                build: {
                                    type: 'object',
                                    additionalProperties: false,
                                    properties: {
                                        commit: {
                                            type: 'string',
                                            nullable: true,
                                            example: 'b0e2bed972f73ea033926121c61807168e0754be'
                                        },
                                        branch: {
                                            type: 'string',
                                            nullable: true,
                                            example: 'master'
                                        },
                                        service: {
                                            type: 'string',
                                            nullable: true,
                                            example: 'nj-store-monorepo2'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        paths: {
            '/health': {
                get: {
                    tags: ['System'],
                    summary: 'Health check',
                    description: 'Returns the current runtime status for the NJ Store API.',
                    responses: {
                        200: {
                            description: 'API is healthy',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/HealthResponse'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    apis: []
});
export { openApiSpec };
