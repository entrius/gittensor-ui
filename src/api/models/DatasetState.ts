export type DatasetState<T> = {
  data: T[];
  isLoading: boolean;
  isError: boolean;
};
