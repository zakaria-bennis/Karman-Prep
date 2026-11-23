import type { CurriculumNode, NodeStatus } from "@/data/curriculum";

/** A curriculum node with the student's status on it, as the quiz screens and admin previews use it. */
export interface MappedNode extends CurriculumNode {
  status: NodeStatus;
}
