import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { linuxSharpLibvipsPath, substituteLinuxSharpLibvips } from '../scripts/linux-sharp-libvips.ts'

async function withDirectory(action: (directory: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'desktop-sharp-libvips-'))
  try {
    await action(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

describe('Linux sharp libvips substitution', () => {
  it('names the libvips library of the shipped sharp package for each architecture', () => {
    expect(linuxSharpLibvipsPath('x64')).toBe(join('node_modules', '@img', 'sharp-libvips-linux-x64', 'lib', 'libvips-cpp.so.8.18.7'))
    expect(linuxSharpLibvipsPath('arm64')).toBe(join('node_modules', '@img', 'sharp-libvips-linux-arm64', 'lib', 'libvips-cpp.so.8.18.7'))
  })

  it('replaces the bundled library with the build that links glib dynamically', async () => {
    await withDirectory(async (directory) => {
      const replacement = join(directory, 'libvips-cpp.so.8.18.7')
      const runtime = join(directory, 'runtime')
      const destination = join(runtime, linuxSharpLibvipsPath('x64'))
      await writeFile(replacement, 'dynamically linked glib')
      await mkdir(dirname(destination), { recursive: true })
      await writeFile(destination, 'bundled static glib')

      substituteLinuxSharpLibvips(runtime, 'x64', replacement)

      expect(await readFile(destination, 'utf8')).toBe('dynamically linked glib')
    })
  })

  it('rejects a missing replacement path', async () => {
    await withDirectory(async (directory) => {
      expect(() => { substituteLinuxSharpLibvips(directory, 'x64', undefined) })
        .toThrow(/DSH_DESKTOP_LINUX_SHARP_LIBVIPS/)
      expect(() => { substituteLinuxSharpLibvips(directory, 'x64', '') })
        .toThrow(/DSH_DESKTOP_LINUX_SHARP_LIBVIPS/)
      expect(() => { substituteLinuxSharpLibvips(directory, 'x64', join(directory, 'absent')) })
        .toThrow(/does not exist/)
    })
  })

  it('rejects a runtime whose sharp package uses another libvips file name', async () => {
    await withDirectory(async (directory) => {
      const replacement = join(directory, 'replacement')
      await writeFile(replacement, 'dynamically linked glib')

      expect(() => { substituteLinuxSharpLibvips(directory, 'x64', replacement) })
        .toThrow(/sharp changed its libvips file name/)
    })
  })
})
