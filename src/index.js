export default {
	async fetch(request, env, ctx) {
		// Check pre-shared key header
		const PRESHARED_AUTH_HEADER_KEY = 'X-Logpush-Auth';
		const PRESHARED_AUTH_HEADER_VALUE = 'mypresharedkey';
		const psk = request.headers.get(PRESHARED_AUTH_HEADER_KEY);
		if (psk !== PRESHARED_AUTH_HEADER_VALUE) {
			return new Response('Sorry, you have supplied an invalid key.', {
				status: 403,
			});
		}

		// Initial pre-flight Logpush Request to confirm the integration check
		const buf = await request.arrayBuffer();
		const compressed = new Uint8Array(buf);
		const enc = new TextDecoder("utf-8");
		if (enc.decode(compressed).trim() === '{"content":"test","filename":"test.txt"}') {
			const json = '{"content":"test","filename":"test.txt"}';
			return await fetch(`https://cloud.axiom.co/api/v1/datasets/${env.AXIOM_DATASET_NAME}/ingest`, {
				method: "POST",
				body: json,
				headers: {
					"Content-Type": "application/x-ndjson",
					Authorization: `Bearer ${env.AXIOM_API_TOKEN}`
				}
			});
		}

		// Decompress gzipped logpush body to ndjson
		const blob = new Blob([buf])
		const ds = new DecompressionStream('gzip');
		const decompressedStream = blob.stream().pipeThrough(ds);
		const buffer = await new Response(decompressedStream).arrayBuffer();
		const decompressed = new Uint8Array(buffer)
		const ndjson = enc.decode(decompressed)

		// Ingest to Axiom
		return await fetch(`https://cloud.axiom.co/api/v1/datasets/${env.AXIOM_DATASET_NAME}/ingest`, {
			method: "POST",
			body: ndjson,
			headers: {
				"Content-Type": "application/x-ndjson",
				Authorization: `Bearer ${env.AXIOM_API_TOKEN}`
			}
		});
	},
};