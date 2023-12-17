import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Bonkers } from "../target/types/bonkers";

describe("bonkers", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Bonkers as Program<Bonkers>;

  it("It initializes Bonkers", async () => {});
});
