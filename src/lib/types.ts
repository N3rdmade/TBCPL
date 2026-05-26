export type SiteStatus = "ok" | "new" | "down" | "trusted";

export interface Site {
  name: string;
  url: string;
  logo: string;
  enabled?: boolean;
  tags?: string[];
  status?: SiteStatus;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  sites: Site[];
}

export interface LinksData {
  categories: Category[];
}

export interface Region {
  code: string;
  name: string;
  flag: string;
  enabled?: boolean;
}

export interface RegionsData {
  regions: Region[];
}

export interface SiteSearchEntry extends Site {
  categoryId: string;
  categoryName: string;
  regionCode: string;
}
