export type ClimateCheckAssiduityProps = {
  sector: string
  date: string
  assiduity: {[employee: string]: boolean}
};

export type ClimateCheckAssiduity = ClimateCheckAssiduityProps & {
  account: string
  created_at: string
};
