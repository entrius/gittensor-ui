import {
  Box,
  BoxProps,
  Breadcrumbs,
  Container,
  Typography,
  Link,
  Stack,
} from "@mui/material";
import React from "react";

export type Breadcrumb = { text: string; link?: string; action?: () => void };

export type PageHeaderProps = BoxProps & {
  title: string;
  breadcrumbs?: Breadcrumb[];
};

const PageHeader: React.FC<PageHeaderProps> = ({
  children,
  title,
  breadcrumbs,
  ...props
}) => (
  <Box
    sx={{
      py: 2,
      backgroundColor: "white",
      borderBottom: 1,
      border: "none",
    }}
    {...props}
  >
    <Container maxWidth={false}>
      {breadcrumbs && (
        <Breadcrumbs aria-label="crumb">
          {breadcrumbs &&
            breadcrumbs.map((breadcrumb) =>
              breadcrumb.link ? (
                <Link key={breadcrumb.text} href={breadcrumb.link}>
                  {breadcrumb.text}
                </Link>
              ) : (
                <Typography key={breadcrumb.text}>{breadcrumb.text}</Typography>
              ),
            )}
        </Breadcrumbs>
      )}
      <Stack gap={2}>
        <Typography variant="h2" lineHeight="40px" fontWeight="medium">
          {title}
        </Typography>
        <Stack direction="row" alignItems="center" gap={2}>
          {children}
        </Stack>
      </Stack>
    </Container>
  </Box>
);

export default PageHeader;
