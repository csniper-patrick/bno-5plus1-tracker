/**
 * Unified configuration for social media platforms.
 * Centralizes display labels, MDI icon identifiers, custom SVG vector paths,
 * and WCAG AA contrast-conforming color palettes for light and dark themes.
 */
export const SOCIAL_PLATFORM_CONFIG = Object.freeze({
  facebook: {
    label: 'Facebook',
    icon: 'mdi-facebook',
    colorLight: '#1877F2',
    colorDark: '#63A4FF', // 5.96:1 against #1C2541 (AA)
  },
  instagram: {
    label: 'Instagram',
    icon: 'mdi-instagram',
    colorLight: '#E4405F',
    colorDark: '#FF6F91', // 5.71:1 against #1C2541 (AA)
  },
  threads: {
    label: 'Threads',
    // Custom inline SVG path as @mdi/font (v7.4.x) does not provide a Threads brand glyph
    svgPath:
      'M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z',
    colorLight: undefined, // inherits currentColor (#0B132B, 17.8:1 AAA)
    colorDark: undefined, // inherits currentColor (#F8FAFC, 13.6:1 AAA)
  },
  x: {
    label: 'X (Twitter)',
    icon: 'mdi-twitter',
    colorLight: '#0C7ABF', // 4.61:1 against #FFFFFF (AA)
    colorDark: '#64B5F6', // 6.82:1 against #1C2541 (AA)
  },
  twitter: {
    label: 'X (Twitter)',
    icon: 'mdi-twitter',
    colorLight: '#0C7ABF',
    colorDark: '#64B5F6',
  },
  youtube: {
    label: 'YouTube',
    icon: 'mdi-youtube',
    colorLight: '#CC0000', // 5.92:1 against #FFFFFF (AA)
    colorDark: '#FF6B6B', // 5.44:1 against #1C2541 (AA)
  },
  linkedin: {
    label: 'LinkedIn',
    icon: 'mdi-linkedin',
    colorLight: '#0A66C2', // 5.69:1 against #FFFFFF (AA)
    colorDark: '#70A9FF', // 6.34:1 against #1C2541 (AA)
  },
  telegram: {
    label: 'Telegram',
    icon: 'mdi-send',
    colorLight: '#0E77AB', // 4.95:1 against #FFFFFF (AA)
    colorDark: '#40B5ED', // 6.51:1 against #1C2541 (AA)
  },
})

/**
 * Returns configuration for a specified social platform with fallback.
 * @param {string} platform - Social platform key
 * @returns {object} Platform configuration
 */
export function getSocialPlatformConfig(platform) {
  return (
    SOCIAL_PLATFORM_CONFIG[platform] || {
      label: platform,
      icon: 'mdi-open-in-new',
      colorLight: undefined,
      colorDark: undefined,
    }
  )
}

