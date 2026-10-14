import { spawn } from 'node:child_process'

// Node refuses to run a .cmd or .bat without a shell, and that is exactly what
// an npm global install leaves on Windows. Only those go through cmd.exe; a
// native binary runs direct, so no command line is built for a shell to parse
// and the deprecation Node raises for shell:true with an args array never fires.
const needsShell = (file) => /\.(cmd|bat)$/i.test(file)

// `--tools ""` is how the CLI is told "no tools", and on the cmd.exe path an
// empty argument has to be spelled as a pair of quotes or it vanishes from
// the line, which would hand the call the CLI's default of every tool.
const quoted = (arg) => (arg === '' || /\s/.test(arg) ? `"${arg}"` : arg)

// Every piece of the command line is a fixed literal: `file` came from the
// PATH lookup and `args` from the provider registry, plus at most a model id
// detection listed, of plain characters only (see cli-models.js). Anything
// user-supplied goes over stdin, which is what keeps quoting and injection
// out of the picture and sidesteps argv length limits on a long resume.
//
// `cwd` is the working directory the CLI sees. Callers hand in an empty
// directory made for the call, so a tool that slipped past the policy would
// find nothing to read there and no project settings to pick up. `env` adds
// variables to the server's own for this one process.
export function start(file, args, cwd, env) {
  const options = { cwd, windowsHide: true, ...(env ? { env: { ...process.env, ...env } } : {}) }
  if (!needsShell(file)) return spawn(file, args, options)
  return spawn([`"${file}"`, ...args.map(quoted)].join(' '), { ...options, shell: true })
}
