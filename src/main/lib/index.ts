import { APP_DIRECTORY_NAME, FILE_ENCODING, WELCOME_NOTE_FILENAME } from '@shared/constants'
import { NoteContent, NoteInfo } from '@shared/models'
import { CreateNote, DeleteNote, GetNotes, WriteNote } from '@shared/types'
import { dialog } from 'electron'
import { ensureDir, readdir, readFile, remove, stat, writeFile } from 'fs-extra'
import { isEmpty } from 'lodash'
import { homedir } from 'os'
import path from 'path'
import welcomeNoteFile from '../../../resources/WelcomeNote.md?asset'

export const getRootDir = () => {
  return `${homedir()}/${APP_DIRECTORY_NAME}`
}

export const getNotes: GetNotes = async () => {
  const rootDir = getRootDir()

  await ensureDir(rootDir)

  const notesFileNames = await readdir(rootDir, {
    encoding: FILE_ENCODING,
    withFileTypes: false
  })

  const notes = notesFileNames.filter((filename) => filename.endsWith('.md'))

  if (isEmpty(notes)) {
    console.info('No notes found, creating welcome note')

    const content = await readFile(welcomeNoteFile, { encoding: FILE_ENCODING })
    await writeFile(`${rootDir}/${WELCOME_NOTE_FILENAME}`, content, { encoding: FILE_ENCODING })
    notes.push(WELCOME_NOTE_FILENAME)
  }

  return Promise.all(notes.map(getNoteInfoFromFilename))
}

export const getNoteInfoFromFilename = async (filename: string): Promise<NoteInfo> => {
  const fileStat = await stat(`${getRootDir()}/${filename}`)

  return {
    title: filename.replace(/\.md$/, ''),
    lastEditTime: fileStat.mtimeMs
  }
}

export const readNote = async (filename: string) => {
  const rootDir = getRootDir()

  return readFile(`${rootDir}/${filename}.md`, { encoding: FILE_ENCODING })
}

export const writeNote: WriteNote = async (filename: string, content: NoteContent) => {
  const rootDir = getRootDir()

  console.info(`Writing note ${filename}`)
  return writeFile(`${rootDir}/${filename}.md`, content, { encoding: FILE_ENCODING })
}

export const createNote: CreateNote = async () => {
  const rootDir = getRootDir()

  await ensureDir(rootDir)

  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'New Note',
    defaultPath: `${rootDir}/Untitled.md`,
    buttonLabel: 'Create',
    properties: ['showOverwriteConfirmation'],
    showsTagField: false,
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })

  if (canceled || !filePath) {
    console.info('Note creation canceled')
    return false
  }

  const { name: filename, dir: parentDir } = path.parse(filePath)

  if (parentDir !== rootDir) {
    await dialog.showMessageBox({
      type: 'error',
      title: 'Creation Failed',
      message: `All notes must be saved under ${rootDir}. Avoid using other directories!`
    })
    return false
  }

  console.info(`Creating note: ${filePath}`)
  await writeFile(filePath, '')

  return filename
}

export const deleteNote: DeleteNote = async (filename: string) => {
  const rootDir = getRootDir()

  const { response } = await dialog.showMessageBox({
    type: 'warning',
    title: 'Delete Note',
    message: `Are you sure you want to delete ${filename}?`,
    buttons: ['Delete', 'Cancel'], // 0 is Delete, 1 is Cancel
    defaultId: 1,
    cancelId: 1
  })

  if (response === 1) {
    console.info('Note deletion canceled')
    return false
  }

  console.info(`Deleting note: ${filename}`)
  await remove(`${rootDir}/${filename}.md`)
  return true
}
