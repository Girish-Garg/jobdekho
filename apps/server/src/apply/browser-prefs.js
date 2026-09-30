import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Chrome and Edge read Default/Preferences when a fresh profile opens. The
// profile is thrown away after one application, but while it exists it must
// have nowhere to keep a password the person types, no autofill of its own to
// fight JobDekho's values, and no third-party cookies to follow them between
// career sites. Safe Browsing stays on: apply links can be scams.
export function applyPreferences(downloadDir) {
  return {
    credentials_enable_service: false,
    credentials_enable_autosignin: false,
    profile: {
      password_manager_enabled: false,
      password_manager_leak_detection: false,
      // 1 blocks third-party cookies; 2 is "block" for these permissions.
      cookie_controls_mode: 1,
      default_content_setting_values: { notifications: 2, geolocation: 2 },
      exit_type: 'Normal',
      exited_cleanly: true,
    },
    autofill: { enabled: false, profile_enabled: false, credit_card_enabled: false },
    payments: { can_make_payment_enabled: false },
    safebrowsing: { enabled: true },
    translate: { enabled: false },
    signin: { allowed: false },
    sync: { requested: false },
    // Downloads are refused by the launch too; if one slips through, it lands
    // inside the throwaway profile and goes with it.
    download: { prompt_for_download: false, directory_upgrade: true, default_directory: downloadDir },
  }
}

export function writePreferences(profileDir) {
  const dir = join(profileDir, 'Default')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'Preferences'), JSON.stringify(applyPreferences(join(profileDir, 'downloads'))))
}
