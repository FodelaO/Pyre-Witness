<!-- Records the agent chat implementation and the raw live SSE checks. -->
# Agents chat API

`POST /api/agents/chat` accepts the three conversation modes and streams attributed messages, typing, errors, and completion. Direct replies address the user. In Group, Scout and Architect answer the room in parallel, rows are published in crew order, and Chief reads every message of the turn before closing it. Each participant can take part in one handoff, and the room can show up to six messages. Chief of staff sends Neon-generated delegations in crew order, the delegated staff answer Chief in parallel, and Chief synthesizes their replies for the operator.

Inspector reads the supplied rule findings and reports the `rules engine` as its engine. The Gemini roles use the existing v1beta Interactions transport at low thinking. The client snapshot includes the current selection, rules risk, estimated annual loss, capture, relevant Watch candidates, and crew status. The route validates a 24 KiB UTF-8 context limit and admits 30 turns per process per five minutes. Message events carry engine and elapsed time. The browser holds the conversation history in memory.

## Verification

- `npm run test -- src/agents/server --maxWorkers=1` passed all 16 tests. Gemini was stubbed in the tests for routing, delegation, failure, and time allocation.
- `npm run typecheck` passed on the second check.
- One `curl -N` check per mode used the browser context builder with the simulated seed twin and `PLC-F3` selected. The context was 1,068 bytes with seven rule findings.
- After the timing change, port 4119 returned HTTP 400 for malformed chat input and HTTP 200 for the app shell.

## Opus correction: all three modes complete live

The developer's live Group and Chief of staff turns timed out partially because every model call ran one after another (Gemini 4 chat calls take about 3-10 s each live, Neon synthesis up to about 10 s). Changes in `src/agents/server/turn.ts`, `gemini.ts`, `personas.ts` and `src/agents/context.ts`:

- **Group**: Scout and Architect run in parallel as the first round. Rows are still published in crew order (scout, architect, inspector, chief). That round may use everything except a 10 s reserve for Chief's closing call. First-round agents may consult `@scout`, `@architect` or `@inspector` but not `@chief`: Chief reads the whole room before closing, and consulting it mid-turn would cost two sequential Neon calls. Trade-off: Architect no longer sees Scout's reply from the same turn. Chief still sees all of them.
- **Chief of staff**: the plan is capped at 9 s. The delegated staff then answer Chief in parallel in one shared window, and 10 s is always left for the synthesis.
- **Direct**: per-call timeout 10 s (was 8 s). The only earlier live Direct sample took 7.4 s, so 8 s left almost no margin.
- Every model call has its own hard timeout. A call with under 2 s left is skipped with an `error` event instead of being sent. A failed or timed-out call becomes an `error` event and the turn continues to Chief's closing message.
- Prompts stay compact: the last 8 history lines and every history or turn line clipped to 600 characters. Thinking stays `low`, with no temperature.
- Replies are plain text. The persona asks for no Markdown, and leftover `**`, `__`, backticks and `*emphasis*` are stripped, because the pane renders `message.text` literally (the first live Group run showed `**PLC-F3**`). A reply cut at 60 words now ends with `…`.
- `lossPerYear` in the context uses the panel's `roundUsd` (2 significant figures, "$110k est. / yr"). Agents had been quoting "111375.40 USD", which is false precision for a simulated estimate.
- Tests: 36 pass in `src/agents` (`npx vitest run src/agents --maxWorkers=1`). New or updated tests cover the parallel first round and parallel staff (the second call starts before the first resolves), crew-order publishing, the hop rules (one first-round hop, a consulted agent's mention ignored, a recursive mention ignored, no first-round `@chief`), the new timeout budgets (`[15000, 15000, 14000]` for Group and `[9000, 7200, 11400]` for Chief of staff), compact history, Markdown stripping and the 60-word marker. `npx tsc --noEmit` passes for the whole repo.
- Browser check: headless Chrome, Inspector Direct chat (rules engine, no Gemini call). The pane shows `You → Inspector` and `Inspector → You · rules engine · PLC-F3 · SAFE-01 · Safety-critical asset is reachable (5/5)`. Screenshots: `.agents/qa/opus-correct/agents-chat-api/inspector-direct.png` and `inspector-direct-pane.png`.

### Live checks after the correction (5 real turns, `curl -N`)

Same context as before: the browser context builder on the simulated seed twin with `PLC-F3` selected (1,068 bytes, 7 rule findings). These runs used `lossPerYear` 111375.40. The `roundUsd` change came after them. Times are the arrival of each SSE frame.

| Run | Mode | Result | Total |
| --- | --- | --- | --- |
| A | Group, scripted hop | Scout 3.0 s · Architect -> @inspector handoff 4.0 s · rules engine reply · Chief summary 7.5 s | 11.5 s |
| B | Chief of staff | Neon plan 4.4 s (3 delegations) · Scout 3.5 s and Architect 5.4 s in parallel · rules engine · Neon synthesis 10.3 s | 20.1 s |
| C | Direct, Architect | Carbon 3.9 s | 3.9 s |
| D | Group, natural prompt, 12 s first-round cap | Scout 6.3 s · **Architect timed out at 12 s** (`error` event) · rules engine · Chief summary 6.9 s naming Architect as unavailable | 19.0 s |
| E | Group, natural prompt, final code | Scout 5.3 s and Architect 5.2 s in parallel · rules engine · Chief summary 8.4 s | 13.7 s |

Run D degraded correctly but exposed an unnecessary limit. Chief waits for the first round anyway, so the separate 12 s first-round cap was removed and that round now gets everything except the 10 s summary reserve (15 s). Run E is the final code. Run A predates the plain-text instruction, so its Markdown is in the raw text.

Known gaps, honestly:

- Provider latency varies. Carbon took 3.9-5.4 s in four live calls and more than 12 s in one. Neon synthesis took 6.9-10.3 s. A slow call still ends as an `error` event, and Chief's closing reply then names the missing agent. Five live samples cannot establish a p95.
- In Group, a model hop after the first round (for example Scout asking `@architect`) gets only the time left before the 10 s summary reserve, so after a slow first round it may time out. Inspector hops are instant. No live run exercised a model-to-model Group hop. Stubbed tests cover it.
- The pane shows one typing indicator at a time. During the parallel first round it shows the agent whose `typing` event came last (Architect), while Scout is also working.
- Group and Chief of staff can still take up to about 25 s, and Direct up to 10 s, before the stream reports a timeout.

#### E · Group, final code

Operator asked “Revisen PLC-F3 y díganme qué atender primero.”

```text
data: {"type":"typing","agent":"scout"}

data: {"type":"typing","agent":"architect"}

data: {"type":"message","id":"e40350d6-4599-4dbc-b067-53695fcbc4a9","from":"scout","to":"group","kind":"reply","text":"Equipo identificado: PLC-F3 (Filler 3 PLC, gabinete PLC en el área Filler 3). Presenta el hallazgo crítico SAFE-01 (severidad 5): activo crítico de seguridad alcanzable. Queda por verificar su exposición de red exacta junto a SW-F3 (ZONE-02) y HMI-F3. Prioricen restringir y aislar el acceso hacia PLC-F3.","engine":"gemini-4-hydrogen","latencyMs":5316}

data: {"type":"message","id":"0d95ab53-e0d6-4739-a26d-bec309ed2b20","from":"architect","to":"group","kind":"reply","text":"PLC-F3 está en el área Filler 3 con riesgo elevado (46.09) y pérdida estimada de 111375.40 USD anuales. Priorice primero el hallazgo crítico SAFE-01 (severidad 5), aislando este activo de seguridad para que no sea alcanzable. En segundo lugar, aplique controles de borde de red en SW-F3 por ZONE-02 y restrinja puertos y medios extraíbles en HMI-F3 (USB-01, PHYS-01).","engine":"gemini-4-carbon","latencyMs":5168}

data: {"type":"message","id":"6607840f-8b2e-4776-83d0-f3b8f58870d3","from":"inspector","to":"group","kind":"reply","text":"PLC-F3 · SAFE-01 · Safety-critical asset is reachable (5/5)","engine":"rules engine","latencyMs":0}

data: {"type":"typing","agent":"chief"}

data: {"type":"message","id":"9b7bb9d4-b95e-478c-90e9-a72dd499fd80","from":"chief","to":"group","kind":"summary","text":"Atienda primero SAFE-01 (severidad 5) en PLC-F3 aislando su acceso, ya que la planta presenta riesgo elevado (46.09) y pérdida estimada de 111375.40 USD anuales.\nDespués, refuerce el borde de red en SW-F3 (ZONE-02) y restrinja medios extraíbles y puertos en HMI-F3 (USB-01, PHYS-01).","engine":"gemini-4-neon","latencyMs":8356}

data: {"type":"done"}


HTTP 200 · 13.675257s
```

#### B · Chief of staff

Operator asked “Coordina una revisión preventiva de PLC-F3: que Scout identifique el equipo, Architect evalúe su zona e Inspector confirme los hallazgos. Atribuye cada aporte.”

```text
data: {"type":"typing","agent":"chief"}

data: {"type":"message","id":"1e051b54-1f17-4472-9271-dfc684442c06","from":"chief","to":"scout","kind":"delegation","text":"@scout: Identifica el equipo PLC-F3 y confirma sus características principales.","engine":"gemini-4-neon","latencyMs":4434}

data: {"type":"message","id":"2352b30d-1232-447f-b681-9af126e7da30","from":"chief","to":"architect","kind":"delegation","text":"@architect: Evalúa la ubicación, la zona y los riesgos defensivos de PLC-F3.","engine":"gemini-4-neon","latencyMs":4434}

data: {"type":"message","id":"20c9dc7c-29ae-437c-a4ae-9336d64e6c64","from":"chief","to":"inspector","kind":"delegation","text":"@inspector: Confirma los hallazgos del motor de reglas asociados a PLC-F3.","engine":"gemini-4-neon","latencyMs":4434}

data: {"type":"typing","agent":"scout"}

data: {"type":"typing","agent":"architect"}

data: {"type":"message","id":"0fb0bf8c-08c0-4560-8ac5-4549f23e7804","from":"scout","to":"chief","kind":"reply","text":"Equipo identificado: PLC-F3 (Filler 3 PLC), tipo plc_cabinet, ubicado en el área Filler 3 de North Beverage Facility, Line 3. Presenta el hallazgo SAFE-01 (activo crítico de seguridad alcanzable, severidad 5). Quedan por verificar su modelo exacto, versión de firmware, estado de puertos físicos y configuración de red.","engine":"gemini-4-hydrogen","latencyMs":3514}

data: {"type":"message","id":"897666d3-2e45-4e88-b42d-4768748a2641","from":"architect","to":"chief","kind":"reply","text":"PLC-F3 (Filler 3 PLC) se ubica en el área Filler 3. Presenta riesgo crítico SAFE-01 (severidad 5) al ser un activo de seguridad alcanzable. En su zona, SW-F3 carece de límite de red (ZONE-02, severidad 4) y HMI-F3 expone puertos físicos y medios extraíbles (USB-01, PHYS-01). Mitigación prioritaria: aplicar segmentación estricta en SW-F3 para aislar PLC-F3 y asegurar físicamente HMI-F3.","engine":"gemini-4-carbon","latencyMs":5393}

data: {"type":"message","id":"c6030c56-ead9-4c4d-bbee-71f22d472ae4","from":"inspector","to":"chief","kind":"reply","text":"PLC-F3 · SAFE-01 · Safety-critical asset is reachable (5/5)","engine":"rules engine","latencyMs":0}

data: {"type":"typing","agent":"chief"}

data: {"type":"message","id":"9c346804-b99d-4dd3-8d2e-c89131e26c9c","from":"chief","to":"user","kind":"summary","text":"Scout identificó a PLC-F3 (Filler 3 PLC, plc_cabinet) en Filler 3. Inspector confirmó el hallazgo crítico SAFE-01 (severidad 5/5). Architect evaluó la zona, señalando riesgos en SW-F3 (ZONE-02) y HMI-F3 (USB-01, PHYS-01), y recomendó segmentar SW-F3 y asegurar HMI-F3. Queda pendiente verificar modelo exacto, firmware, puertos físicos y configuración de red de PLC-F3.","engine":"gemini-4-neon","latencyMs":10259}

data: {"type":"done"}


HTTP 200 · 20.091298s
```

#### C · Direct to Architect

Operator asked “¿Qué mitigación priorizas para PLC-F3 en el gemelo simulado?”

```text
data: {"type":"typing","agent":"architect"}

data: {"type":"message","id":"abb9939b-47cb-41b8-b15e-a8fb041feab3","from":"architect","to":"user","kind":"reply","text":"En esta planta simulada, el activo crítico PLC-F3 (Filler 3 PLC, área Filler 3) presenta el riesgo prioritario SAFE-01 de severidad 5 por ser alcanzable en red. Además, SW-F3 carece de fronteras aplicadas (ZONE-02, severidad 4). Priorizo segmentar la red aplicando controles de acceso estrictos en SW-F3 para aislar PLC-F3 y reducir el riesgo elevado de 46.09.","engine":"gemini-4-carbon","latencyMs":3858}

data: {"type":"done"}


HTTP 200 · 3.877631s
```

#### A · Group with a scripted hop

Operator asked “Revisen PLC-F3. Architect, confirma con @inspector los hallazgos de PLC-F3. Chief, resume la revisión defensiva.”

```text
data: {"type":"typing","agent":"scout"}

data: {"type":"typing","agent":"architect"}

data: {"type":"message","id":"fd8c0726-905b-4096-afe0-5f95f2a9c38b","from":"scout","to":"group","kind":"reply","text":"Identificado **PLC-F3** (*Filler 3 PLC*), un gabinete PLC (`plc_cabinet`) ubicado en el área **Filler 3** de North Beverage Facility, Line 3.\n\nQuedan por verificar:\n- Estado físico del gabinete y controles de acceso.\n- Versión de firmware y configuración de red exacta.\n- Ruta de alcanzabilidad reportada en el hallazgo `SAFE-01` (severidad 5).","engine":"gemini-4-hydrogen","latencyMs":2966}

data: {"type":"message","id":"ebe40b89-9907-4765-839e-5588942f08cb","from":"architect","to":"inspector","kind":"handoff","text":"@inspector: ¿Puedes confirmar los detalles de los hallazgos para PLC-F3, específicamente SAFE-01 (severidad 5), y si su exposición está vinculada a SW-F3 (ZONE-02)?","engine":"gemini-4-carbon","latencyMs":3950}

data: {"type":"message","id":"f873a0f9-1922-42c1-b3ef-def55b974d4f","from":"inspector","to":"architect","kind":"reply","text":"PLC-F3 · SAFE-01 · Safety-critical asset is reachable (5/5)\nSW-F3 · ZONE-02 · Unenforced network boundary (4/5)\nSW-PK · ZONE-02 · Unenforced network boundary (4/5)","engine":"rules engine","latencyMs":0}

data: {"type":"message","id":"e4b85f0a-b2b9-436a-93bd-a8dbd119d39e","from":"inspector","to":"group","kind":"reply","text":"PLC-F3 · SAFE-01 · Safety-critical asset is reachable (5/5)","engine":"rules engine","latencyMs":0}

data: {"type":"typing","agent":"chief"}

data: {"type":"message","id":"4c61323d-8f16-4aaf-bd95-8655c332dcc2","from":"chief","to":"group","kind":"summary","text":"Se identificó **PLC-F3** (Filler 3) con el hallazgo crítico **SAFE-01** (5/5, activo de seguridad alcanzable) y límites de red sin aplicar (**ZONE-02**, 4/5) en **SW-F3** y **SW-PK**.\nPriorice segmentar y aislar la ruta hacia PLC-F3; falta verificar el estado físico del gabinete, el firmware y la configuración de red exacta.","engine":"gemini-4-neon","latencyMs":7540}

data: {"type":"done"}


HTTP 200 · 11.498469s
```

#### D · Group, degraded under the old 12 s first-round cap

Operator asked “Revisen PLC-F3 y díganme qué atender primero.”

```text
data: {"type":"typing","agent":"scout"}

data: {"type":"typing","agent":"architect"}

data: {"type":"message","id":"5df04663-f532-49ef-97cd-397fa74fba9a","from":"scout","to":"group","kind":"reply","text":"Equipo identificado: PLC-F3 (Filler 3 PLC), gabinete PLC en el área Filler 3. Presenta el hallazgo crítico SAFE-01 (severidad 5), indicando que es un activo de seguridad alcanzable. Quedan por verificar los detalles de su segmentación de red y controles físicos. Conviene atender primero el aislamiento de PLC-F3.","engine":"gemini-4-hydrogen","latencyMs":6290}

data: {"type":"error","agent":"architect","message":"Gemini timed out."}

data: {"type":"message","id":"be735dfc-5d12-4ae0-a34c-c7bb5d0ecd87","from":"inspector","to":"group","kind":"reply","text":"PLC-F3 · SAFE-01 · Safety-critical asset is reachable (5/5)","engine":"rules engine","latencyMs":0}

data: {"type":"typing","agent":"chief"}

data: {"type":"message","id":"ee634a60-f20b-481c-b329-62113abc221b","from":"chief","to":"group","kind":"summary","text":"PLC-F3 (Filler 3 PLC) en Filler 3 presenta el hallazgo crítico SAFE-01 (severidad 5/5) al ser un activo de seguridad alcanzable.\nAtiende primero el aislamiento de PLC-F3; queda pendiente la evaluación de ubicación y riesgos porque architect no está disponible.","engine":"gemini-4-neon","latencyMs":6925}

data: {"type":"done"}


HTTP 200 · 18.940274s
```

## Earlier partial runs (developer, before the correction)

These checks ran before the timeout allocation adjustment. Direct returned Neon. Group returned Hydrogen and the rules engine, with Architect and Chief timeouts. Chief of staff returned a Neon synthesis after its planning call timed out.

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

data: {"type":"message","id":"44053552-9c6b-4215-adb3-529c78daabd2","from":"chief","to":"user","kind":"summary","text":"En North Beverage Facility, Line 3 (riesgo 46.09, elevado), el activo seleccionado es PLC-F3 (Filler 3 PLC, área Filler 3) con el hallazgo SAFE-01 (severidad 5: activo crítico de seguridad alcanzable). En este turno no llegaron aportes del equipo; queda pendiente la identificación por @scout y la confirmación de hallazgos por @inspector.","engine":"gemini-4-neon","latencyMs":9829}

data: {"type":"done"}

HTTP 200 · 16.098380s
```
