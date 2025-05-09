export interface FileItemBase {
  uuid: string
  name: string
  type: FileType
  modificationTime: string | Date
  attributes: {
    [key: string]: string | number | boolean
  }
}


export const FileType = {
  FOLDER: 'FOLDER',
  NETWORK: 'NETWORK',
  SHORTCUT: 'SHORTCUT',
} as const

export type FileType = (typeof FileType)[keyof typeof FileType]