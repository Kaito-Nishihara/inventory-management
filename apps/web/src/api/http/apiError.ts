import { mapValidationMessageFromResponse } from "../../features/validation/messages"

export type ApiErrorDetails = {
  status: number
  code?: string
  message: string
  requiresLogin: boolean
}

type ProblemDetailsLike = {
  title?: string
  detail?: string
  status?: number
  code?: string
}

function mapStatusMessage(status: number): string {
  if (status === 401) return "認証期限切れです。再ログインしてください。"
  if (status === 403) return "この操作を実行する権限がありません。"
  if (status === 404) return "対象データが見つかりません。"
  if (status === 409) return "競合が発生しました。内容を確認して再試行してください。"
  return `APIエラーが発生しました (${status})`
}

async function tryReadProblemDetails(response: Response): Promise<ProblemDetailsLike | null> {
  try {
    const payload = (await response.clone().json()) as ProblemDetailsLike
    if (!payload || typeof payload !== "object") return null
    return payload
  } catch {
    return null
  }
}

export async function normalizeApiError(response: Response): Promise<ApiErrorDetails> {
  const validationMessage = await mapValidationMessageFromResponse(response.clone())
  if (validationMessage) {
    return {
      status: response.status,
      code: "validation_error",
      message: validationMessage,
      requiresLogin: false,
    }
  }

  const problem = await tryReadProblemDetails(response)
  if (problem?.detail && typeof problem.detail === "string") {
    return {
      status: response.status,
      code: typeof problem.code === "string" ? problem.code : undefined,
      message: problem.detail,
      requiresLogin: response.status === 401,
    }
  }
  if (problem?.title && typeof problem.title === "string") {
    return {
      status: response.status,
      code: typeof problem.code === "string" ? problem.code : undefined,
      message: problem.title,
      requiresLogin: response.status === 401,
    }
  }

  return {
    status: response.status,
    message: mapStatusMessage(response.status),
    requiresLogin: response.status === 401,
  }
}
