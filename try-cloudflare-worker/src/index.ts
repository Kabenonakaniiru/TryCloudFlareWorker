import { handleRequest } from './routes';
import { ruleHandler } from './handlers/rules';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// 既存のHTMLファイルを返す処理があればここに
		// なければルーティングへ回す
		return handleRequest(request, env);
	},

	async scheduled(event: ScheduledEvent, env: Env) {
		// 定期実行処理
		await ruleHandler.runDailyLifecycle(env);
	}
};