export interface KnowledgeTypeExample {
  facts: string;
  strategies: string;
  procedures: string;
  rationales: string;
}

export interface SubjectExample {
  subject: string;
  topic: string;
  gradeLevel?: string;
  introduction: string;
  assessment: KnowledgeTypeExample;
  selfReview: string;
}

export const MATH: SubjectExample = {
  subject: "Mathematics",
  topic: "Two-Step Equations",
  gradeLevel: "8th Grade",
  introduction: [
    "Script for self-assessment",
    "I want to teach you how to assess your own knowledge that you have about a subject area.",
    "Let's do this by taking an example that you already know. Suppose you wanted to assess your own knowledge about solving 2-step equations of the form ax + b = c. An example of this type of problem is 2x + 3 = 15. If I want to be able to solve problems like these, I need four types of knowledge. These are facts, strategies, procedures and rationales. Fact are concepts you have that describe objects or elements. For example, for two step equations, I need to know what variables, constants, coefficients, equations, and expressions are. Strategies are general processes I would use to solve a problem. For two step equations, this would be reverse order of operations. Procedures are the specific steps that I would use in a strategy. So if I am using reverse order of operations, I need to know additive and multiplicative inverses. Finally, I need to know rationales which are the reasons why the strategies or the procedures work the way they do. For example, this could include things like the subtraction or the division property of equality that says that when you do the same operation to both sides of an equation, you preserve the value of the equation. You can think of facts as telling you \"what\", strategies and procedures as telling you \"how\" and rationales as telling you \"why\".",
  ].join("\n"),
  assessment: {
    facts: "For facts, I need to know what variables, constants, coefficients, equations and expressions are. A variable is an unknown quantity, usually represented by a letter. A constant is a specific number. A coefficient is a number that you multiply a variable by like 2x. An equation is an expression that is equally to another expression and the two expressions are joined by an equal sign. An expression is one or more terms that are combined by mathematical operations like addition, subtraction, multiplication and division.",
    strategies: "For strategies, I need to know reverse order of operations which is SADMEP. This stands for subtraction, addition, division, multiplication, exponents and parentheses. I know that I'm supposed to do these in order but I don't remember whether I'm supposed to do subtraction always before addition or just which one goes first. The same is true for division and multiplication.",
    procedures: "For procedures, I need to know additive inverse and multiplicative inverse. The additive inverse is taking the number with the opposite sign as the constant and adding it to both sides of the equation. The multiplicative inverse is taking the inverse of the coefficient of the variable and multiplying both sides of the equation by it. However, if the coefficient is negative, I'm not sure if the multiplicative inverse is supposed to be negative as well.",
    rationales: "For rationales, I believe the two rationales I need are the subtraction property of equality and the division property of equality. The subtraction property of equality says that if I subtract the same number from both sides, which is what I'm doing with the additive inverse, I preserve the equality. Similarly, the division property of equality says that if I divide both sides of the equation by the same number, which is what I'm doing with the multiplicative inverse, I preserve the equality.",
  },
  selfReview: "When I look over what I wrote, I see that I am good with my facts. On my strategy, I'm not sure about the order of steps in reverse order of operations when it comes to subtraction and addition or multiplication and division, so I need to learn those. On procedures, I'm not sure what to do with multiplicative inverses when the coefficient is negative, so I need to learn that as well. For rationales, I think I'm OK. I don't think I have any missing facts/concepts that I left out that I should know or I didn't list any facts/concepts where I didn't know what they were. For the strategy, I believe I listed the correct strategy and parts of the strategy, but I wasn't sure about some of the ordering of steps in the strategy. For procedures, I was good on the additive inverse but had a question on carrying out the multiplicative inverse when the coeffcient was negative. For rationales, I think I had all the rationales that were important and that I understood them as well. I don't think I left anything out.",
};

export const READING: SubjectExample = {
  subject: "Reading Comprehension",
  topic: "Little Red Riding Hood",
  introduction: [
    "Script for self-assessment",
    "I want to teach you how to assess your own knowledge that you have about a subject area. Let's do this by taking an example that you already know. Suppose you wanted to assess your own knowledge about the story Little Red Riding Hood. If I want to be able to understand stories, I need four types of knowledge. These are facts, strategies, procedures and rationales. Fact are concepts you have that describe objects or elements. For example, in reading, facts can be characters or elements of the setting such as location or time period. Strategies are the general plot sequences of events that authors use to make the points or express the themes or conflicts they write about. Procedures are the specific events in the story that are part of the overall strategy or plot. Finally, I need to know rationales which are the reasons behind the plot elements or events. Rationales could include things like author's purpose, the character's goals (why the characters act the way they do) and how elements of the story reinforce the points the author is trying to make. You can think of facts as telling you \"what\", strategies and procedures as telling you \"how\" and rationales as telling you \"why\".",
  ].join("\n"),
  assessment: {
    facts: "For facts, I need to know the characters, setting and time period. The main characters are Little Red Riding Hood (protagonist), the wolf (antagonist), the mother, the grandmother and the woodsman. The story is set long ago and in a forest and near the forest for Little Red Riding Hood's home and the Grandmother's home.",
    strategies: "For the general plot, a little girl is asked by her mother to give a basket of goodies to her sick grandmother. Even though she's told not to talk to strangers, she does and is almost killed because of it.",
    procedures: "For specific events, a mother tells Little Red Riding Hood that her grandmother is sick and to bring the grandmother a basket of goodies. The mother warns Little Red Riding Hood not to talk to strangers. While walking through the woods to get to the grandmother's house, Little Red Riding Hood meets a wolf who asks where she's going. Little Red Riding Hood tells the wolf, who then takes a shortcut to the grandmother's house and impersonates the grandmother. When Little Red Riding Hood arrives, she notices something odd about the grandmother and after a series of questions, the wolf reveals himself and says he'll eat Little Red Riding Hood. Fortunately, a nearby woodsman hears Little Red Riding Hood's screams for help and saves Little Red Riding Hood.",
    rationales: "For rationales, I believe the author wrote the story to warn children about the dangers of talking to strangers. The protagonist is a little girl because the story is aimed at children. The wolf has to attack Little Red Riding Hood because the story needs to show the danger of talking to strangers. Little Red Riding Hood has to be saved in the end because it may be too scary for children to read stories about a little girl who gets eaten by a wolf.",
  },
  selfReview: "When I look over what I wrote, I see that I am good with my facts. I know who the characters are, and I know that the story is set long ago and in and near a forest. On my story plot and events, I forget whether the wolf ate the grandmother or just locked her in a closet because Little Red Riding Hood was coming. Also, I'm not sure what happened to the wolf at the end. For rationales, I'm not sure why the setting had to be in a forest or why the antagonist was a wolf as opposed to a person or other animal. I don't think I left anything out.",
};

export const HISTORY: SubjectExample = {
  subject: "History",
  topic: "Declaration of Independence",
  introduction: [
    "Script for self-assessment for history",
    "I want to teach you how to assess your own knowledge that you have about a subject area. Let's do this by taking an example that you already know. Suppose you wanted to assess your own knowledge about the Declaration of Independence. If I want to check my knowledge of this, I need to assess four types of knowledge. These are facts, strategies, procedures and rationales. Fact are concepts you have that describe objects or elements. For example, for historical knowledge, I need to know the relevant people, dates, locations, the context of the event, etc. Since historical events are typically described in a problem-solution text structure, the strategy knowledge is the problem being faced and the strategy or solution to that problem. Procedures are specific events that occurred in the strategy, Finally, I need to know rationales which are the reasons why the events happened or any outcomes they produced. Since historical events often describe problems and solutions, I need to know what the problems and solutions were and why those particular solutions were chosen. A rationale could also be how the historical event affects the present or other time periods or how it impacted other parts of the world. You can think of facts as telling you \"what\", strategies and procedures as telling you \"how\" and rationales as telling you \"why\".",
  ].join("\n"),
  assessment: {
    facts: "For facts, I need to know the key people, dates, locations and content (which could be the problem people were facing). In this case, I know that Thomas Jefferson wrote the Declaration of Independence in 1776. I know that King George III was king of England and that the colonies were under British rule. I know that John Hancock signed the Declaration of Independence bigger than anyone else did. I don't remember the other names of the signers. I know that, at the time, the colonies didn't want to remain under British rule. I don't remember all the reasons listed in the Declaration of Independence, but no taxation without representation was one of them.",
    strategies: "For strategies, I know that the general problem was that the colonists didn't want to be under British rule, so during the Revolutionary War, they signed the Declaration of Independence to get France to side with them.",
    procedures: "For procedures, I know that the general flow of events was that the colonies were under British rule and were unhappy about it. There were a series of protests like the Boston Tea Party. Eventually, war broke out between England and the colonies. The colonists issued the Declaration of Independence to get France to align itself with the colonies, since France was a rival of England. The French did join the war, and the colonies won.",
    rationales: "For rationales, I believe the reason why the Declaration of Independence was written was that France needed to believe that the United States was going to be an independent country that could be an ally of France rather than having France believe that it was intervening in a civil war between two parts of Great Britain. That this also led to the first democracy, thereby showing the world that such a form of government is possible.",
  },
  selfReview: "When I look over what I wrote, I see that I am good with the basics of my facts. I know some of the main players, but I don't know all the signers of the Declaration of Independence. On my strategy, I think I see the reason for the Declaration as part of the push for independence, but I'm not sure why other strategies weren't possible. On procedures, I'm not sure about the mechanism that got all the signers to approve it, since this would have been considered an act of treason. For rationales, I think I'm OK. I don't think I have any incorrect facts, although I mentioned not knowing all the people who signed the Declaration of Independence. For strategy, I think I have the strategy down, but I'm not sure how the colonists knew the strategy would work and that France would help them. It seems like this was a gamble. For procedures, I'm pretty sure I got the key events and I don't think I'm missing anything important. For rationales, I think I had all the rationales that were important and that I understood them as well. I don't think I left anything out.",
};

export const ALL_EXAMPLES: SubjectExample[] = [MATH, READING, HISTORY];

export function formatExampleBlock(example: SubjectExample): string {
  const label = example.gradeLevel
    ? `${example.subject} — ${example.topic}, ${example.gradeLevel}`
    : `${example.subject} — ${example.topic}`;

  const assessmentText = [
    example.assessment.facts,
    example.assessment.strategies,
    example.assessment.procedures,
    example.assessment.rationales,
  ].join("\n");

  return `(${label}):
INTRODUCTION:
${example.introduction}

MODEL SELF-ASSESSMENT:
With this in mind, this is how I might assess my own knowledge of ${example.topic}.
${assessmentText}

SELF-REVIEW:
${example.selfReview}`;
}

export function buildExamplesBlock(): string {
  return ALL_EXAMPLES.map(
    (ex, i) => `EXAMPLE ${i + 1} ${formatExampleBlock(ex)}`,
  ).join("\n\n");
}
