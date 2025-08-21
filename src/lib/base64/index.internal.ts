export async function fromBuffer(bytes: ArrayBuffer, type = "application/octet-stream"): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = Object.assign(new FileReader(), {
      onload: () => resolve(reader.result as string),
      onerror: () => reject(reader.error),
    });

    reader.readAsDataURL(new File([bytes], "", { type }));
  });
}

export function encodeURL(input: string): string {
  return input.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
