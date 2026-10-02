import { describe, it, expect } from 'vitest'
import { parseArgs, HELP } from '@jobdekho/server/cli/args.js'

describe('the jobdekho command\'s options', () => {
  it('needs none: a free port, the user data folder, and the browser opened', () => {
    expect(parseArgs([])).toEqual({ port: null, data: null, open: true, help: false, version: false })
  })

  it('takes a port and a folder, written either way', () => {
    expect(parseArgs(['--port', '4800', '--data', 'C:/jobs'])).toMatchObject({ port: 4800, data: 'C:/jobs' })
    expect(parseArgs(['--port=4800', '--data=./jobs'])).toMatchObject({ port: 4800, data: './jobs' })
  })

  it('can leave the browser closed, and print help or the version', () => {
    expect(parseArgs(['--no-open']).open).toBe(false)
    expect(parseArgs(['-h']).help).toBe(true)
    expect(parseArgs(['--help']).help).toBe(true)
    expect(parseArgs(['-v']).version).toBe(true)
    expect(HELP).toMatch(/npx jobdekho@latest/)
  })

  it('says what was wrong rather than guessing', () => {
    expect(parseArgs(['--prot', '4800'])).toEqual({ error: 'Unknown option: --prot' })
    expect(parseArgs(['--port'])).toEqual({ error: '--port needs a value' })
    expect(parseArgs(['--data='])).toEqual({ error: '--data needs a value' })
    expect(parseArgs(['--port', 'abc'])).toEqual({ error: '--port takes a number from 1 to 65535, not "abc"' })
    expect(parseArgs(['--port', '70000']).error).toMatch(/1 to 65535/)
  })
})
