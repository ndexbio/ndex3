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

export const FilterStateType = {
    CHOOSE: 'choose',
    NULL: null,
} as const

export type FilterStateType = (typeof FilterStateType)[keyof typeof FilterStateType]

export const ItemDropdownType = {
    FOLDER: 'folder',
    NETWORK: 'network',
} as const

export type ItemDropdownType = (typeof ItemDropdownType)[keyof typeof ItemDropdownType]

