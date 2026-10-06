// Shared only for response handling; fetch stays in each table's service file.
export async function readResponse<T>(response: Response): Promise<T> {
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.error ?? result?.message ?? `เรียก API ไม่สำเร็จ (${response.status})`);
  }
  if (result === null) throw new Error("API ไม่ได้ส่งข้อมูล JSON กลับมา");
  return result as T;
}
