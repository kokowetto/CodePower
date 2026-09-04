/**
 * Microsoft Teams Webhook / Power Automate 集成模块
 * 严格按照 Teams Adaptive Card 1.5 规范与工业级传输重试标准实现
 */

export interface ApplicationNotificationData {
  applicantName: string;
  applicantEmail: string;
  projectName: string;
  credits: number;
  userLimit: number;
  usedCredits: number;
  finalReason: string;
  applyTime: string;
}

export interface PostToTeamsOptions {
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: typeof fetch;
}

const MAX_PAYLOAD_BYTES = 28 * 1024; // 28 KB Teams Webhook 硬上限

/**
 * 组装符合 Teams 协议规范的 Adaptive Card 1.5 消息体
 */
export function buildTeamsAdaptiveCard(data: ApplicationNotificationData) {
  const mentionText = '<at>Sun, Guo Yang</at>';

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.5',
          body: [
            {
              type: 'TextBlock',
              text: '⚡ CodePower 额度申领待审批',
              weight: 'Bolder',
              size: 'Large',
              color: 'Accent',
            },
            {
              type: 'TextBlock',
              text: `${mentionText} 收到新的 GitHub Copilot 额度申领，请及时审批处理：`,
              wrap: true,
            },
            {
              type: 'FactSet',
              facts: [
                { title: '申请人员', value: `${data.applicantName} (${data.applicantEmail})` },
                { title: '所属项目', value: data.projectName },
                { title: '申请额度', value: `${data.credits} credits` },
                { title: '用量/上限', value: `${data.usedCredits} / ${data.userLimit} credits` },
                { title: '用途理由', value: data.finalReason },
                { title: '申请时间', value: `${data.applyTime} (北京时间)` },
              ],
            },
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: '前往系统审批 ↗',
              url: 'https://codepower.pages.dev',
            },
          ],
          msteams: {
            entities: [
              {
                type: 'mention',
                text: mentionText,
                mentioned: {
                  id: '8:orgid:21b56c8f-8924-4d1c-8f09-740cb6962e98',
                  name: 'Sun, Guo Yang',
                },
              },
            ],
          },
        },
      },
    ],
  };
}

/**
 * 可靠的 Teams Webhook 传输函数
 * - 28 KB 大小安全守卫
 * - 2xx（含 200, 202）视同成功
 * - 400 客户端错误不重试（快速失败）
 * - 5xx / 429 / 超时 带退避自动重试
 */
export async function postToTeams(
  url: string,
  payload: any,
  options: PostToTeamsOptions = {}
): Promise<void> {
  const { timeoutMs = 4000, retries = 2, fetchImpl = fetch } = options;

  const bodyStr = JSON.stringify(payload);
  const bodyBytes = new TextEncoder().encode(bodyStr).length;

  // 1. 28 KB Size Guard
  if (bodyBytes >= MAX_PAYLOAD_BYTES) {
    throw new Error(`Teams payload size (${bodyBytes} bytes) exceeds 28 KB limit`);
  }

  let attempt = 0;
  while (attempt <= retries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: bodyStr,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 2. 2xx（含 200, 202）视同成功
      if (res.status >= 200 && res.status < 300) {
        console.log(`Teams webhook sent successfully on attempt ${attempt} (HTTP ${res.status})`);
        return;
      }

      // 3. 400 客户端错误不重试（快速失败）
      if (res.status === 400) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Teams webhook failed with HTTP 400: ${errText}`);
      }

      // 4. 处理 429 限流
      if (res.status === 429) {
        const retryAfterHeader = res.headers.get('Retry-After');
        const delaySeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 1;
        if (attempt <= retries) {
          await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
          continue;
        }
      }

      // 5. 5xx 服务端错误
      if (res.status >= 500 && attempt <= retries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        continue;
      }

      const errBody = await res.text().catch(() => '');
      throw new Error(`Teams webhook failed with HTTP ${res.status}: ${errBody}`);
    } catch (err: any) {
      clearTimeout(timeoutId);

      // 如果是 400 则直接抛出，不重试
      if (err.message && err.message.includes('HTTP 400')) {
        throw err;
      }

      // 若重试次数耗尽，则抛出异常
      if (attempt > retries) {
        throw err;
      }

      // 其他网络或超时错误，等待后重试
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
}
