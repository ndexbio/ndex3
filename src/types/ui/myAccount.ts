export const MyAccountTabType = {
    MYNETWORKS: 'MYNETWORKS',
    TRASH: 'TRASH',
    SHARED: 'SHARED',
} as const

export type MyAccountTabType = (typeof MyAccountTabType)[keyof typeof MyAccountTabType]

export const FilterOptionType = {
    EDGE_COUNT: 'edgeCount',
    NODE_COUNT: 'nodeCount',
    MODIFICATION_TIME: 'modificationTime',
} as const

export type FilterOptionType = (typeof FilterOptionType)[keyof typeof FilterOptionType]

