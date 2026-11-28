import { NDExFileType } from '@js4cytoscape/ndex-client'
import { TRASH_RETENTION_DAYS } from '@/lib/constants/trash'
import {
  buildRestoreConfirmation,
  buildTrashConfirmation,
} from './trash-confirmation'

describe('buildTrashConfirmation', () => {
  it('warns that a folder takes its contents with it', () => {
    const { title, message } = buildTrashConfirmation([
      { name: 'My Folder', type: NDExFileType.FOLDER },
    ])

    expect(title).toBe('Move folder to trash?')
    expect(message).toContain('"My Folder" and any contents')
    expect(message).toContain('moved to the trash')
  })

  it('does not claim contents for a single network', () => {
    const { title, message } = buildTrashConfirmation([
      { name: 'My Network', type: NDExFileType.NETWORK },
    ])

    expect(title).toBe('Move network to trash?')
    expect(message).toContain('"My Network" will be moved')
    expect(message).not.toContain('contents')
  })

  it('always states the retention window', () => {
    for (const type of [NDExFileType.FOLDER, NDExFileType.NETWORK]) {
      expect(buildTrashConfirmation([{ name: 'x', type }]).message).toContain(
        `deleted forever after ${TRASH_RETENTION_DAYS} days`,
      )
    }
  })

  it('mentions folders for a mixed batch, and counts the items', () => {
    const { title, message } = buildTrashConfirmation([
      { name: 'a', type: NDExFileType.NETWORK },
      { name: 'b', type: NDExFileType.FOLDER },
      { name: 'c', type: NDExFileType.NETWORK },
    ])

    expect(title).toBe('Move 3 items to trash?')
    expect(message).toContain('including folders and any contents')
  })

  it('omits the folder wording for a batch of networks only', () => {
    const { message } = buildTrashConfirmation([
      { name: 'a', type: NDExFileType.NETWORK },
      { name: 'b', type: NDExFileType.NETWORK },
    ])

    expect(message).toContain('2 items')
    expect(message).not.toContain('folders')
  })
})

describe('buildRestoreConfirmation', () => {
  const folder = { name: 'My Folder', type: NDExFileType.FOLDER }

  it('states how many items come back with the folder', () => {
    const { title, message } = buildRestoreConfirmation([folder], 4)

    expect(title).toBe('Restore folder from trash?')
    expect(message).toContain('also restores its contents')
    expect(message).toContain('4 items')
  })

  it('uses the singular for a single restored item', () => {
    expect(buildRestoreConfirmation([folder], 1).message).toContain('1 item will')
  })

  it('says only the folder is coming back when nothing was found inside', () => {
    const { message } = buildRestoreConfirmation([folder], 0)

    expect(message).toContain('Nothing else in the trash was found')
    expect(message).not.toContain('also restores its contents')
  })

  it('admits when the contents could not be fully determined', () => {
    const complete = buildRestoreConfirmation([folder], 4, false).message
    const partial = buildRestoreConfirmation([folder], 4, true).message

    expect(partial).toContain('could not be checked')
    expect(complete).not.toContain('could not be checked')
  })
})
