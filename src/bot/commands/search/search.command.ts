import { Command } from 'src/bot/base/commandRegister.decorator';
import { CommandMessage } from 'src/bot/base/command.abstract';
import { ChannelMessage } from 'mezon-sdk';
import { SearchService } from 'src/bot/services/search.service';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { getRandomColor } from 'src/bot/utils/helps';
import { ButtonAction, MessageComponentType } from 'src/bot/constants/types';
import {
  ActionRowComponent,
  ButtonComponent,
} from 'src/bot/constants/interfaces';
// Thêm import helper reply
import {
  safeReply,
  createReplyOptions,
  createPreMarkdown,
} from 'src/bot/utils/reply-helpers';

@Command('search')
export class SearchCommand extends CommandMessage {
  constructor(
    private searchService: SearchService,
    clientService: MezonClientService,
  ) {
    super(clientService);
  }

  async execute(args: string[], message: ChannelMessage): Promise<any> {
    const messageChannel = await this.getChannelMessage(message);
    if (!messageChannel) return;

    if (args.length === 0) {
      return this.showHelp(messageChannel);
    }

    const type = args[0].toLowerCase();

    if (type === 'commands' || type === 'bugs' || type === 'solutions') {
      // Tìm kiếm theo loại cụ thể
      return this.handleTypeSearch(type, args.slice(1), messageChannel);
    } else {
      // Nếu không phải là loại cụ thể, coi như tìm kiếm tất cả với từ khóa là tất cả args
      return this.handleGenericSearch(args, messageChannel);
    }
  }

  private async showHelp(messageChannel: any): Promise<any> {
    return safeReply(messageChannel, {
      t: '🔍 Hướng dẫn sử dụng lệnh search',
      embed: [
        {
          color: getRandomColor(),
          title: 'DevHelper - Search Help',
          description: 'Công cụ tìm kiếm thông tin trong hệ thống:',
          fields: [
            {
              name: '🔎 Tìm kiếm tổng hợp',
              value:
                '*search [từ khóa]\n\n' +
                'Tìm kiếm tất cả các loại (lệnh, bug, giải pháp) cùng lúc.\n\n' +
                'Ví dụ: `*search git commit`',
            },
            {
              name: '📝 Tìm kiếm lệnh',
              value:
                '*search commands [từ khóa]\n\n' +
                'Chỉ tìm kiếm trong các lệnh đã lưu.\n\n' +
                'Ví dụ: `*search commands stash`',
            },
            {
              name: '🐛 Tìm kiếm bug',
              value:
                '*search bugs [từ khóa]\n\n' +
                'Chỉ tìm kiếm trong các báo cáo bug.\n\n' +
                'Ví dụ: `*search bugs token`',
            },
            {
              name: '💡 Tìm kiếm giải pháp',
              value:
                '*search solutions [từ khóa]\n\n' +
                'Chỉ tìm kiếm trong các giải pháp đã đề xuất.\n\n' +
                'Ví dụ: `*search solutions authentication`',
            },
            {
              name: '📌 Lưu ý khi sử dụng',
              value:
                '• Tìm kiếm không phân biệt chữ hoa chữ thường\n' +
                '• Từ khóa có thể gồm nhiều từ cách nhau bởi dấu cách\n' +
                '• Kết quả tìm kiếm tổng hợp hiển thị tối đa 5 kết quả cho mỗi loại\n' +
                '• Tìm kiếm được thực hiện trong tiêu đề, mô tả và các trường liên quan',
            },
          ],
          footer: {
            text: 'Gõ *search [từ khóa] để bắt đầu tìm kiếm',
          },
        },
      ],
    });
  }

  private async handleGenericSearch(
    args: string[],
    messageChannel: any,
  ): Promise<any> {
    if (args.length === 0) {
      return safeReply(
        messageChannel,
        createReplyOptions(
          '❌ Thiếu từ khóa tìm kiếm!',
          createPreMarkdown('❌ Thiếu từ khóa tìm kiếm!'),
        ),
      );
    }

    const query = args.join(' ');

    try {
      // Tìm kiếm đa loại
      const results = await this.searchService.search(query);

      if (
        results.commands.length === 0 &&
        results.bugs.length === 0 &&
        results.solutions.length === 0
      ) {
        return safeReply(
          messageChannel,
          createReplyOptions(
            `🔍 Không tìm thấy kết quả nào cho "${query}".`,
            createPreMarkdown(`🔍 Không tìm thấy kết quả nào cho "${query}".`),
          ),
        );
      }

      // Tạo nội dung hiển thị kết quả
      let resultText = `🔍 Kết quả tìm kiếm cho "${query}":\n\n`;

      // Hiển thị lệnh
      if (results.commands.length > 0) {
        resultText += `📝 LỆNH (${results.commands.length}):\n`;
        results.commands.slice(0, 5).forEach((cmd, index) => {
          resultText += `${index + 1}. #${cmd.id}: ${cmd.title} - ${cmd.description || 'Không có mô tả'}\n`;
        });
        if (results.commands.length > 5) {
          resultText += `... và ${results.commands.length - 5} lệnh khác\n`;
        }
        resultText += '\n';
      }

      // Hiển thị bug
      if (results.bugs.length > 0) {
        resultText += `🐛 BUG (${results.bugs.length}):\n`;
        results.bugs.slice(0, 5).forEach((bug, index) => {
          resultText += `${index + 1}. #${bug.id}: ${bug.title} - ${bug.status} (${bug.severity})\n`;
        });
        if (results.bugs.length > 5) {
          resultText += `... và ${results.bugs.length - 5} bug khác\n`;
        }
        resultText += '\n';
      }

      // Hiển thị giải pháp
      if (results.solutions.length > 0) {
        resultText += `💡 GIẢI PHÁP (${results.solutions.length}):\n`;
        results.solutions.slice(0, 5).forEach((solution, index) => {
          resultText += `${index + 1}. #${solution.id}: ${solution.title} - Bug: #${solution.bug.id}\n`;
        });
        if (results.solutions.length > 5) {
          resultText += `... và ${results.solutions.length - 5} giải pháp khác\n`;
        }
      }

      return safeReply(
        messageChannel,
        createReplyOptions(resultText, createPreMarkdown(resultText)),
      );
    } catch (error) {
      return safeReply(
        messageChannel,
        createReplyOptions(
          `❌ Lỗi khi tìm kiếm: ${error.message}`,
          createPreMarkdown(`❌ Lỗi khi tìm kiếm: ${error.message}`),
        ),
      );
    }
  }

  private async handleTypeSearch(
    type: string,
    args: string[],
    messageChannel: any,
  ): Promise<any> {
    if (args.length === 0) {
      return safeReply(
        messageChannel,
        createReplyOptions(
          '❌ Thiếu từ khóa tìm kiếm!',
          createPreMarkdown('❌ Thiếu từ khóa tìm kiếm!'),
        ),
      );
    }

    const query = args.join(' ');

    try {
      // Tìm kiếm theo loại
      const results = await this.searchService.searchByType(query, type);

      if (results.length === 0) {
        return safeReply(
          messageChannel,
          createReplyOptions(
            `🔍 Không tìm thấy ${this.getTypeDisplayName(type)} nào cho "${query}".`,
            createPreMarkdown(
              `🔍 Không tìm thấy ${this.getTypeDisplayName(type)} nào cho "${query}".`,
            ),
          ),
        );
      }

      // Tạo nội dung hiển thị kết quả
      let resultText = `🔍 Kết quả tìm kiếm ${this.getTypeDisplayName(type)} cho "${query}":\n\n`;

      results.forEach((item, index) => {
        if (type === 'commands') {
          resultText += `${index + 1}. #${item.id}: ${item.title} - ${item.description || 'Không có mô tả'}\n`;
        } else if (type === 'bugs') {
          const solutionCount = item.solutions ? item.solutions.length : 0;
          resultText += `${index + 1}. #${item.id}: ${item.title} - ${item.status} (${item.severity})${solutionCount > 0 ? ` - ${solutionCount} giải pháp` : ''}\n`;
        } else if (type === 'solutions') {
          resultText += `${index + 1}. #${item.id}: ${item.title} - Bug: #${item.bug.id} - ${item.bug.title}\n`;
        }
      });

      return safeReply(
        messageChannel,
        createReplyOptions(resultText, createPreMarkdown(resultText)),
      );
    } catch (error) {
      return safeReply(
        messageChannel,
        createReplyOptions(
          `❌ Lỗi khi tìm kiếm: ${error.message}`,
          createPreMarkdown(`❌ Lỗi khi tìm kiếm: ${error.message}`),
        ),
      );
    }
  }

  // Helper methods
  private getTypeDisplayName(type: string): string {
    switch (type) {
      case 'commands':
        return 'lệnh';
      case 'bugs':
        return 'bug';
      case 'solutions':
        return 'giải pháp';
      default:
        return type;
    }
  }

  private getSingularType(type: string): string {
    switch (type) {
      case 'commands':
        return 'command';
      case 'bugs':
        return 'bug';
      case 'solutions':
        return 'solution';
      default:
        return type;
    }
  }
}
