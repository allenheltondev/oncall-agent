.PHONY: dev start test typecheck compose-up compose-down

dev:
	bun run dev

start:
	bun run start

test:
	bun test

typecheck:
	bun run typecheck

compose-up:
	docker compose up --build

compose-down:
	docker compose down
