export class TestDataFactory {
  private static testIdCounter = 0;

  static generateTestId(prefix = 'e2e_test'): string {
    return `${prefix}_${Date.now()}_${this.testIdCounter++}`;
  }

  static createMockApiKeys(): Record<string, string> {
    return {
      openai: process.env.E2E_OPENAI_TEST_KEY || 'sk-test-' + this.generateTestId(),
      anthropic: process.env.E2E_ANTHROPIC_TEST_KEY || 'sk-ant-test-' + this.generateTestId(),
      google: process.env.E2E_GOOGLE_TEST_KEY || 'test-' + this.generateTestId(),
      mistral: process.env.E2E_MISTRAL_TEST_KEY || 'test-' + this.generateTestId(),
      together: process.env.E2E_TOGETHER_TEST_KEY || 'test-' + this.generateTestId(),
    };
  }

  static createTestUser() {
    const userId = this.generateTestId('user');
    return {
      id: userId,
      storagePrefix: `e2e_test_${userId}`,
      apiKeys: this.createMockApiKeys(),
      settings: this.createDefaultSettings(),
    };
  }

  static createDefaultSettings() {
    return {
      temperature: 0.7,
      maxTokens: 1000,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      systemPrompt: 'You are a helpful AI assistant in a test environment.',
    };
  }

  static createTestMessage(content?: string) {
    return {
      id: this.generateTestId('msg'),
      content: content || `Test message ${Date.now()}`,
      role: 'user' as const,
      timestamp: Date.now(),
    };
  }

  static createTestConversation(messageCount = 3) {
    const messages = [];
    for (let i = 0; i < messageCount; i++) {
      messages.push({
        id: this.generateTestId('msg'),
        content: `Test message ${i + 1}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        timestamp: Date.now() + i * 1000,
      });
    }
    return {
      id: this.generateTestId('conv'),
      messages,
      createdAt: Date.now(),
    };
  }

  static getCleanupPattern(): RegExp {
    return /^e2e_test_/;
  }

  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}