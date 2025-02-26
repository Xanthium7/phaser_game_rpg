export type NPCState = "idle" | "moving" | "interacting" | "decision_pending";
export type NPCAction = {
  type: string;
  target?: string;
  location?: { x: number; y: number };
  reason?: string;
  startTime: number;
  duration?: number;
  completed: boolean;
};

class NPCStateManager {
  private npcStates: Record<
    string,
    {
      state: NPCState;
      currentAction: NPCAction | null;
      actionHistory: NPCAction[];
      interactionTarget: string | null;
      lastDecisionTime: number;
      completedActions: string[];
      actionCooldowns: Record<string, number>;
    }
  > = {};

  constructor() {}

  initializeNPC(npcId: string): void {
    this.npcStates[npcId] = {
      state: "idle",
      currentAction: null,
      actionHistory: [],
      interactionTarget: null,
      lastDecisionTime: Date.now(),
      completedActions: [],
      actionCooldowns: {},
    };
  }

  setState(npcId: string, state: NPCState): void {
    if (!this.npcStates[npcId]) this.initializeNPC(npcId);
    this.npcStates[npcId].state = state;
  }

  getState(npcId: string): NPCState {
    if (!this.npcStates[npcId]) this.initializeNPC(npcId);
    return this.npcStates[npcId].state;
  }

  setCurrentAction(npcId: string, action: NPCAction): void {
    if (!this.npcStates[npcId]) this.initializeNPC(npcId);

    // Complete current action if exists
    if (this.npcStates[npcId].currentAction) {
      this.completeCurrentAction(npcId);
    }

    this.npcStates[npcId].currentAction = action;

    // Set cooldown for this action type
    const actionType = action.type;
    this.npcStates[npcId].actionCooldowns[actionType] = Date.now() + 300000; // 5 minute cooldown
  }

  getCurrentAction(npcId: string): NPCAction | null {
    if (!this.npcStates[npcId]) this.initializeNPC(npcId);
    return this.npcStates[npcId].currentAction;
  }

  completeCurrentAction(npcId: string): void {
    if (!this.npcStates[npcId] || !this.npcStates[npcId].currentAction) return;

    const action = this.npcStates[npcId].currentAction;
    action.completed = true;

    this.npcStates[npcId].actionHistory.push(action);
    this.npcStates[npcId].completedActions.push(action.type);

    // Keep action history limited to last 10 actions
    if (this.npcStates[npcId].actionHistory.length > 10) {
      this.npcStates[npcId].actionHistory.shift();
    }
    if (this.npcStates[npcId].completedActions.length > 20) {
      this.npcStates[npcId].completedActions.shift();
    }

    this.npcStates[npcId].currentAction = null;
    this.setState(npcId, "decision_pending");
  }

  getRecentActions(npcId: string, count: number = 5): NPCAction[] {
    if (!this.npcStates[npcId]) this.initializeNPC(npcId);
    return [...this.npcStates[npcId].actionHistory].slice(-count);
  }

  canPerformAction(npcId: string, actionType: string): boolean {
    if (!this.npcStates[npcId]) this.initializeNPC(npcId);

    const cooldownTime = this.npcStates[npcId].actionCooldowns[actionType] || 0;

    // Check if the action is on cooldown
    if (Date.now() < cooldownTime) {
      return false;
    }

    // Check how many times this action appears in recent history
    const recentActionCount = this.npcStates[npcId].completedActions.filter(
      (action) => action === actionType
    ).length;

    // Limit repeating the same action too often
    if (recentActionCount >= 2) {
      return false;
    }

    return true;
  }

  getActionSummary(npcId: string): string {
    if (!this.npcStates[npcId]) this.initializeNPC(npcId);

    const actions = this.getRecentActions(npcId, 3);
    if (actions.length === 0) return "No recent actions";

    return actions
      .map(
        (action) =>
          `${action.type} ${action.reason ? `(${action.reason})` : ""}`
      )
      .join(", then ");
  }

  setInteractionTarget(npcId: string, targetId: string | null): void {
    if (!this.npcStates[npcId]) this.initializeNPC(npcId);
    this.npcStates[npcId].interactionTarget = targetId;
  }

  getInteractionTarget(npcId: string): string | null {
    if (!this.npcStates[npcId]) this.initializeNPC(npcId);
    return this.npcStates[npcId].interactionTarget;
  }
}

const npcStateManager = new NPCStateManager();
export default npcStateManager;
