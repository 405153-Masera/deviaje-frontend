export interface BaseResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
}