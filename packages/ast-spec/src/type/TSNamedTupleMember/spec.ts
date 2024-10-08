import type { AST_NODE_TYPES } from '../../ast-node-types';
import type { BaseNode } from '../../base/BaseNode';
import type { Identifier } from '../../expression/Identifier/spec';
import type { TypeNode } from '../../unions/TypeNode';

export interface TSNamedTupleMember extends BaseNode {
  elementType: TypeNode;
  label: Identifier;
  optional: boolean;
  type: AST_NODE_TYPES.TSNamedTupleMember;
}
