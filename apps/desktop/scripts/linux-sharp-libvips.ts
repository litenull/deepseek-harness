/** Substitute the libvips library of the bundled sharp image codec with a Linux build that links glib dynamically. */

import { copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Return the libvips C++ library that `@img/sharp-libvips-linux-*` installs and that the sharp
 * addon loads by this exact file name.
 * @param arch - Architecture of the prepared Linux runtime.
 * @returns Path of the library relative to a runtime directory that holds `node_modules`.
 */
export function linuxSharpLibvipsPath(arch: 'arm64' | 'x64'): string {
  return join('node_modules', '@img', `sharp-libvips-linux-${arch}`, 'lib', 'libvips-cpp.so.8.18.7')
}

/**
 * Replace the libvips copy bundled with the sharp image codec.
 *
 * The bundled library statically embeds glib and exports its symbols (electron#46323). Electron
 * links glib dynamically from a shared store, so image decoding binds mixed glib copies and
 * crashes. The replacement links glib dynamically and ships without a run path, so it resolves
 * its dependencies from the loading process.
 * @param runtimeRoot - Prepared Desktop runtime directory that holds `node_modules`.
 * @param arch - Architecture of the prepared Linux runtime.
 * @param replacement - Absolute path of the substitute library, or undefined when unset.
 */
export function substituteLinuxSharpLibvips(runtimeRoot: string, arch: 'arm64' | 'x64', replacement: string | undefined): void {
  if (replacement === undefined || replacement === '') {
    throw new Error('desktop runtime: DSH_DESKTOP_LINUX_SHARP_LIBVIPS must name the Linux libvips replacement; run packaging from deepseek-harness-build.nix')
  }
  if (!existsSync(replacement)) {
    throw new Error(`desktop runtime: libvips replacement ${replacement} does not exist`)
  }
  const relative = linuxSharpLibvipsPath(arch)
  const destination = join(runtimeRoot, relative)
  if (!existsSync(destination)) {
    throw new Error(`desktop runtime: ${relative} is missing; sharp changed its libvips file name, so the Linux replacement needs a matching update`)
  }
  copyFileSync(replacement, destination)
}
