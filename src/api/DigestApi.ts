import { useApiQuery } from "./ApiUtils";
import { Content, Digest, Link } from "./models/Digest";

export const useDigest = () =>
  useApiQuery<Digest[]>("useDigest", "/subnets/digest");

// export const useLink = (subnetId: number, linkType: string) =>
//   useApiQuery<Link[]>(
//     "useLink",
//     `/api/subnets/github/${subnetId}/${linkType}`
//   );

export const useGithubLinks = () =>
  useApiQuery<Link[]>("useGithubLinks", "/subnets/githublinks");

export const useSubnetInfo = (subnetId: string) =>
  useApiQuery<Content>("useGithubLinks", `/subnets/${subnetId}`);

export const useLastModificationTime = (subnetId: string, area: string) =>
  useApiQuery<Date>("useGithubLinks", `/subnets/${subnetId}/?area=${area}`);
