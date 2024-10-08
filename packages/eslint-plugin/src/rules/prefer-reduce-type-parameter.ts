import type { TSESTree } from '@typescript-eslint/utils';
import * as tsutils from 'ts-api-utils';
import type * as ts from 'typescript';

import {
  createRule,
  getConstrainedTypeAtLocation,
  getParserServices,
  isStaticMemberAccessOfValue,
  isTypeAssertion,
} from '../util';

type MemberExpressionWithCallExpressionParent = TSESTree.MemberExpression & {
  parent: TSESTree.CallExpression;
};

export default createRule({
  name: 'prefer-reduce-type-parameter',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce using type parameter when calling `Array#reduce` instead of casting',
      recommended: 'strict',
      requiresTypeChecking: true,
    },
    messages: {
      preferTypeParameter:
        'Unnecessary cast: Array#reduce accepts a type parameter for the default value.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = getParserServices(context);
    const checker = services.program.getTypeChecker();

    function isArrayType(type: ts.Type): boolean {
      return tsutils
        .unionTypeParts(type)
        .every(unionPart =>
          tsutils
            .intersectionTypeParts(unionPart)
            .every(t => checker.isArrayType(t) || checker.isTupleType(t)),
        );
    }

    return {
      'CallExpression > MemberExpression.callee'(
        callee: MemberExpressionWithCallExpressionParent,
      ): void {
        if (!isStaticMemberAccessOfValue(callee, context, 'reduce')) {
          return;
        }

        const [, secondArg] = callee.parent.arguments;

        if (callee.parent.arguments.length < 2 || !isTypeAssertion(secondArg)) {
          return;
        }

        // Get the symbol of the `reduce` method.
        const calleeObjType = getConstrainedTypeAtLocation(
          services,
          callee.object,
        );

        // Check the owner type of the `reduce` method.
        if (isArrayType(calleeObjType)) {
          context.report({
            messageId: 'preferTypeParameter',
            node: secondArg,
            fix: fixer => {
              const fixes = [
                fixer.removeRange([
                  secondArg.range[0],
                  secondArg.expression.range[0],
                ]),
                fixer.removeRange([
                  secondArg.expression.range[1],
                  secondArg.range[1],
                ]),
              ];

              if (!callee.parent.typeArguments) {
                fixes.push(
                  fixer.insertTextAfter(
                    callee,
                    `<${context.sourceCode.getText(secondArg.typeAnnotation)}>`,
                  ),
                );
              }

              return fixes;
            },
          });

          return;
        }
      },
    };
  },
});
