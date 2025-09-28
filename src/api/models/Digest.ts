import dayjs from "dayjs";

export type Digest = {
  id: number;
  name: string;
  summary: string;
};

export type Link = {
  subnetId: number;
  link: string;
  type: string;
};

export type Content = {
  subnetId: number;
  name: string;
  description: string;
  minerInfo: string;
  valiInfo: string;
  updated_at: Date;
};
