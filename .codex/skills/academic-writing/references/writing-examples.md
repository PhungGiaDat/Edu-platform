# Writing Examples

Use these examples as patterns, not text to copy. Preserve the manuscript's terminology and evidence.

## Explain the system before listing internals

Weak:

> The runtime binds identity, public references, replies, and idempotency; the platform mediates discovery, matching, negotiation, settlement, and governance; and the World maintains lifecycle state.

Better:

> Agents communicate through the protocol, while the platform checks whether each request may proceed. Accepted actions update the shared World.

Why: the revision gives the reader the division of responsibility before implementation detail.

## Connect an example to the main contribution

Weak:

> The exchange is valid only if it is authorized, replayable, linked, idempotent, and auditable.

Better:

> The Buyer and Merchant each act for a different person and may negotiate with several counterparties. The example shows how their agents reach one transaction through the shared market.

Why: use the example to teach the two-sided environment if that is the main claim. Move audit detail to the mechanism or evaluation section.

## Avoid overstating record coverage

Weak:

> Every evaluated decision is linked to an ordered commit and resulting state delta.

Better:

> Every evaluated decision is linked to its actor and validation outcome. Accepted state-changing decisions are also linked to their commits and resulting state changes.

Why: rejected, read-only, and abstaining decisions need not produce commits.

## Turn numbers into a finding

Weak:

> Model A scores 82.2, Model B scores 76.1, and Model C scores 74.6.

Better:

> Performance differs most on Buyer tasks rather than Merchant tasks. Model A's overall advantage is concentrated in the families that require the agent to continue through a staged transaction.

Why: the prose states the pattern. The table supplies the complete numbers.

## Distinguish observation from explanation

Weak:

> Safety training makes larger models reject the task.

Better:

> Several stronger models stop early more often, while the smaller model more often attempts the next step. This pattern may reflect conservative post-training, but the experiment does not isolate that cause.

Why: behavior is observed; the cause is a hypothesis.

## Describe related work through a boundary

Weak:

> Work A supports interoperability. Work B supports payments. Work C studies marketplaces.

Better:

> Existing protocols standardize deployment and payment interactions, while marketplace environments study agent behavior. Our setting combines a two-sided market with execution records that connect each decision to its transaction outcome.

Why: the reader learns both what prior work contributes and where the present work differs.

## Make a task definition concrete

Weak:

> Multi-item tasks evaluate complex shopping.

Better:

> A Multi-item task asks the Buyer to construct a feasible cart and then navigate the listing-to-checkout workflow. The instruction states when a later action becomes available so that workflow discovery is not confused with hidden interface behavior.

Why: define both the commercial reasoning and the interaction requirement.

## Explain process rewards without claiming RL results

Weak:

> The trace enables RL training.

Better:

> The trace links intermediate decisions to verified outcomes, providing process-level reward signals that a later learning pipeline could use. This paper evaluates the signals but does not train a policy.

Why: an available signal is not an RL experiment.

## Synchronize a changed figure

Weak caption:

> Overview of the framework and benchmark results.

Better caption:

> ACWorld connects independently controlled Buyer and Merchant agents through a shared market. The highlighted path follows one accepted offer from the agents, through platform validation, to the World update.

After revising the figure, update the first reference, panel descriptions, caption, accessibility text, and any prose that describes removed visual elements.

## Fix a terminal orphan line

Before:

> Figures 1, 2, and 3 follow one transaction from user intent to an authorized World update.

If “World update” becomes a short final line, compress without deleting meaning:

> Figures 1 to 3 follow one transaction from user intent to its authorized World update.

Render the page after the edit. Do not optimize source length blindly.
