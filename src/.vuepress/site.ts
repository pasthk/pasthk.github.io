export const HOSTNAME = "https://www.pasthk.com";

export const HOST = HOSTNAME.replace(/^https?:\/\//, "");

export const absoluteUrl = (path: string): string => `${HOSTNAME}${path}`;

export const SITE_NAME = "香港文獻類編";

export const SITE_TAGLINE = "認識香港，從文獻開始";

export const SITE_NAME_EN = "Thematic Compilation of Hong Kong Archives";
