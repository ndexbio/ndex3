export const MyAccountTabType = {
    MYNETWORKS: 'MYNETWORKS',
    TRASH: 'TRASH',
    SHARED: 'SHARED',
} as const

export type MyAccountTabType = (typeof MyAccountTabType)[keyof typeof MyAccountTabType]