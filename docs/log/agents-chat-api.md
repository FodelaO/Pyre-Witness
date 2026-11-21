<!-- Records the agent chat implementation and the raw live SSE checks. -->
# Agents chat API

`POST /api/agents/chat` accepts the three conversation modes and streams attributed messages, typing, errors, and completion. Direct replies address the user. Group replies follow the crew order and carry earlier messages from the same turn. Each participant can take part in one handoff, and the room can show up to six messages. Chief of staff sends Neon-generated delegations in crew order and synthesizes staff replies for the operator.

Inspector reads the supplied rule findings and reports the `rules engine` as its engine. The Gemini roles use the existing v1beta Interactions transport at low thinking. The client snapshot includes the current selection, rules risk, estimated annual loss, capture, relevant Watch candidates, and crew status. The route validates a 24 KiB UTF-8 context limit and admits 30 turns per process per five minutes. Message events carry engine and elapsed time. The browser holds the conversation history in memory.

## Verification

- `npm run test -- src/agents/server --maxWorkers=1` passed all 16 tests. Gemini was stubbed in the tests for routing, delegation, failure, and time allocation.
- `npm run typecheck` passed on the second check.
- One `curl -N` check per mode used the browser context builder with the simulated seed twin and `PLC-F3` selected. The context was 1,068 bytes with seven rule findings.
- After the timing change, port 4119 returned HTTP 400 for malformed chat input and HTTP 200 for the app shell.

## Live transcripts

These checks ran before the timeout allocation adjustment. Direct returned Neon. Group returned Hydrogen and the rules engine, with Architect and Chief timeouts. Chief of staff returned a Neon synthesis after its planning call timed out. The final allocation gives Chief up to ten seconds to plan and reserves ten seconds for synthesis. The timing change and the full delegation sequence passed focused tests. Full live Group and staff delegation completion remain unverified.

### Direct

Operator asked “¿Qué riesgo de PLC-F3 debería revisar primero en el gemelo simulado?”

```text
data: {"type":"typing","agent":"chief"}

data: {"type":"message","id":"0d5b5949-dfcd-48e7-8fe7-afac0ebab373","from":"chief","to":"user","kind":"reply","text":"En esta planta simulada (riesgo elevado: 46.09), revisa primero el hallazgo **SAFE-01** en **PLC-F3** (Filler 3 PLC): *\"Safety-critical asset is reachable\"*, de severidad 5. Es el riesgo más crítico del activo. Como mitigación defensiva, prioriza aislarlo y restringir su alcance en la red. Puedo coordinar a @inspector y @architect para profundizar.","engine":"gemini-4-neon","latencyMs":7416}

data: {"type":"done"}

HTTP 200 · 7.700026s
```

### Group

Operator asked “Revisen PLC-F3. Architect, dirige una pregunta a @inspector para confirmar los hallazgos de PLC-F3. Chief, resume la revisión defensiva.”

```text
data: {"type":"typing","agent":"scout"}

data: {"type":"message","id":"89e049e6-7dd1-441b-b5e5-e1906610da20","from":"scout","to":"group","kind":"reply","text":"Equipo identificado: PLC-F3 (Filler 3 PLC), gabinete PLC ubicado en el área Filler 3. Presenta el hallazgo crítico SAFE-01 (activo crítico de seguridad alcanzable, severidad 5). Queda por verificar el estado de cierre físico del gabinete, su versión de firmware y la ruta de red exacta que permite su alcance.","engine":"gemini-4-hydrogen","latencyMs":5777}

data: {"type":"typing","agent":"architect"}

data: {"type":"error","agent":"architect","message":"Gemini timed out."}

data: {"type":"message","id":"f064601f-2e0f-453d-bcbe-4af17f065f46","from":"inspector","to":"group","kind":"reply","text":"PLC-F3 · SAFE-01 · Safety-critical asset is reachable (5/5)","engine":"rules engine","latencyMs":0}

data: {"type":"typing","agent":"chief"}

data: {"type":"error","agent":"chief","message":"Gemini timed out."}

data: {"type":"done"}

HTTP 200 · 18.612014s
```

### Chief of staff

Operator asked “Coordina una revisión preventiva de PLC-F3. Pide a Scout identificar el equipo y a Inspector confirmar los hallazgos de PLC-F3. Atribuye cada aporte en la síntesis.”

```text
data: {"type":"typing","agent":"chief"}

data: {"type":"error","agent":"chief","message":"Gemini timed out."}

data: {"type":"typing","agent":"chief"}

data: {"type":"message","id":"44053552-9c6b-4215-adb3-529c78daabd2","from":"chief","to":"user","kind":"summary","text":"En Bebidas del Norte, Line 3 (riesgo 46.09, elevado), el activo seleccionado es PLC-F3 (Filler 3 PLC, área Filler 3) con el hallazgo SAFE-01 (severidad 5: activo crítico de seguridad alcanzable). En este turno no llegaron aportes del equipo; queda pendiente la identificación por @scout y la confirmación de hallazgos por @inspector.","engine":"gemini-4-neon","latencyMs":9829}

data: {"type":"done"}

HTTP 200 · 16.098380s
```
