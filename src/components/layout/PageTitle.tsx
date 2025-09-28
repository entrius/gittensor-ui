import { Typography, Stack, Divider } from "@mui/material";
import React from "react";

export type PageTitleProps = {
  title: string;
};

const PageTitle: React.FC<PageTitleProps> = ({ title }) => (
  <Stack alignItems="center">
    <Typography variant="h5" sx={{ pb: 4 }}>
      {title}
    </Typography>
    <Divider flexItem sx={{ borderWidth: "1px" }} variant="middle" />
  </Stack>
);

export default PageTitle;
