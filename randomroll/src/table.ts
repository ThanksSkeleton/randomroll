import seedrandom from "seedrandom";

export type ExportFormat<TObject> =
{
    name: string;
    seed: string;
    generated_on: string;
    guid: string;
    column_names: string[]
    flattened: string[][]
    objects: TObject[]
}

export function BuildExportFormat<TObject>(name: string, seed: string, col_names: string[], flattened_input: string[][], data_object: TObject[]) : ExportFormat<TObject> 
{
    return {
        name: name,
        seed: seed,
        generated_on: new Date().toString(),
        guid: crypto.randomUUID(),
        column_names: col_names,
        flattened: flattened_input,
        objects: data_object
    }
}

export type SingletonTable = {
  version: string;
  name: string;
  label?: string;
  table: {
    entries: string[];
  };
};

export type MultiColumnTable = {
  version: string;
  name: string;
  label?: string;
  table: {
    columns: string[];
    rows: string[][];
  };
};

export function random_single(rng: seedrandom.PRNG, data:string[]) : string 
{
    let len = data.length;
    if (len == 0) { throw Error("No Data"); }
    let index = Math.floor(rng() * len);
    return data[index];
}

export function random_multi(rng: seedrandom.PRNG, data:string[][]) : string[]
{
    let len = data.length;
    if (len == 0) { throw Error("No Data"); }
    let index = Math.floor(rng() * len);
    return data[index];
}