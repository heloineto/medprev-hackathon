import axios from "axios";

export async function addProceduresToCart(procedures: string) {
  const foundProcedures = await searchProcedures(procedures);
  const foundSchedulesInUrl = await searchSchedules(
    foundProcedures.map((procedure) => procedure?.code)
  );

  return foundSchedulesInUrl;
}

export async function searchSchedules(proceduresIds: string[]) {
  try {
    const url = buildSearchSchedulesUrl(proceduresIds);

    return url;
  } catch (error) {
    console.error("Error searching schedules", error);
  }
}

function buildSearchSchedulesUrl(procedureCodes: string[]): string {
  const baseUrl =
    "https://agendamento.medprev.online/busca/exames-laboratoriais";
  const params = new URLSearchParams({
    cidade: "Curitiba",
  });

  procedureCodes
    .filter((code) => code)
    .forEach((code) => {
      params.append("exames", code);
    });

  return `${baseUrl}?${params.toString()}`;
}

export async function searchProcedures(procedures: string) {
  const filteredProcedures = procedures
    .split("\n")
    .map((procedure) => procedure.trim())
    .filter((procedure) => procedure !== "" && procedure.startsWith("-"))
    .map((procedure) => procedure.slice(2));

  const proceduresPromises = filteredProcedures.map(async (procedure) => {
    const foundProcedure = await getProcedure(procedure);
    return foundProcedure;
  });

  const foundProcedures = await Promise.all(proceduresPromises);

  return foundProcedures;
}

async function getProcedure(procedureName: string) {
  try {
    const url = `https://rest.medprev.app/search/search-by-type?search=${procedureName}&limit=20`;
    const response = await axios.get(url);
    return response.data.results[0];
  } catch (error) {
    console.error("Error getting procedure", error);
  }
}
