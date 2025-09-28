import { ContainerProps, Stack } from "@mui/material";
import React from "react";

const baseTitle = "Gittensor";
export type PageProps = ContainerProps & {
  title?: string;
};

const Page: React.FC<PageProps> = ({ children, title, ...props }) => {
  document.title = title ? `${baseTitle} - ${title}` : baseTitle;

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      gap={{ xs: 2, md: 4 }}
      py={{ xs: 1, md: 2 }}
      sx={{ width: "100%", maxWidth: "100%" }}
    >
      <Stack gap={2} sx={{ width: "100%", maxWidth: "100%" }}>
        {children}
      </Stack>
    </Stack>
  );
};

export default Page;
