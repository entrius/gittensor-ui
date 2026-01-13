import React from 'react';
import RepositoryScoreCard from './RepositoryScoreCard';
import RepositoryContributorsTable from './RepositoryContributorsTable';
import RepositoryPRsTable from './RepositoryPRsTable';

interface RepositoryDetailsProps {
  repositoryFullName: string;
}

const RepositoryDetails: React.FC<RepositoryDetailsProps> = ({
  repositoryFullName,
}) => (
  <>
    <RepositoryScoreCard repositoryFullName={repositoryFullName} />
    <RepositoryContributorsTable repositoryFullName={repositoryFullName} />
    <RepositoryPRsTable repositoryFullName={repositoryFullName} />
  </>
);

export default RepositoryDetails;
