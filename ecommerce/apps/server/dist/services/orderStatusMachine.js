export const orderStatusTransitions = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: []
};
export const canTransitionOrderStatus = (from, to) => orderStatusTransitions[from]?.includes(to) ?? false;
export const assertOrderStatusTransition = (from, to) => {
    if (!canTransitionOrderStatus(from, to)) {
        throw new Error(`Cannot move order from ${from} to ${to}`);
    }
};
