import React from "react";
import { Page } from "../components/layout";
import { RepositoryWeightsTable } from "../components/repositories";

const RepositoriesPage: React.FC = () => {
  return (
    <Page title="Repositories">
      <RepositoryWeightsTable />
    </Page>
  );
};

export default RepositoriesPage;
