import { NextRequest, NextResponse } from "next/server";

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

function normalizeCep(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ cep: string }> }) {
  const { cep } = await params;
  const normalizedCep = normalizeCep(cep);

  if (normalizedCep.length !== 8) {
    return NextResponse.json({ error: "Digite um CEP com 8 numeros." }, { status: 400 });
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${normalizedCep}/json/`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 }
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Nao foi possivel consultar este CEP agora." }, { status: 502 });
    }

    const data = (await response.json()) as ViaCepResponse;
    if (data.erro) {
      return NextResponse.json({ error: "CEP nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      postalCode: data.cep || normalizedCep,
      addressLine: data.logradouro || "",
      addressComplement: data.complemento || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || ""
    });
  } catch {
    return NextResponse.json({ error: "Nao foi possivel consultar este CEP agora." }, { status: 502 });
  }
}
