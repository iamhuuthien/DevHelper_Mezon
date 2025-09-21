import { Command } from 'src/bot/base/commandRegister.decorator';
import { CommandMessage } from 'src/bot/base/command.abstract';
import { ChannelMessage, EMarkdownType } from 'mezon-sdk';
import { SolutionService } from 'src/bot/services/solution.service';
import { BugService } from 'src/bot/services/bug.service';
import { MezonClientService } from 'src/mezon/services/mezon-client.service';
import { getRandomColor } from 'src/bot/utils/helps';
import {
  ButtonAction,
  MessageComponentType,
  BugStatus,
} from 'src/bot/constants/types';
import {
  ActionRowComponent,
  ButtonComponent,
} from 'src/bot/constants/interfaces';
import { parseArgs } from 'src/bot/utils/parse-args';
import {
  safeReply,
  createReplyOptions,
  createPreMarkdown,
} from 'src/bot/utils/reply-helpers';

@Command('solution')
export class SolutionCommand extends CommandMessage {
  constructor(
    private solutionService: SolutionService,
    private bugService: BugService,
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

    const subCommand = args[0].toLowerCase();
    const remainingArgs = parseArgs(args.slice(1)); // Sử dụng helper mới

    try {
      switch (subCommand) {
        case 'create':
          return this.handleCreate(remainingArgs, messageChannel);
        case 'list':
          return this.handleList(remainingArgs, messageChannel);
        case 'detail':
          return this.handleDetail(remainingArgs, messageChannel);
        case 'update':
          return this.handleUpdate(remainingArgs, messageChannel);
        default:
          return this.showHelp(messageChannel);
      }
    } catch (error) {
      console.error('Error in SolutionCommand:', error);
      return safeReply(
        messageChannel,
        createReplyOptions(
          `❌ Lỗi: ${error.message}`,
          createPreMarkdown(`❌ Lỗi: ${error.message}`),
        ),
      );
    }
  }

  private async showHelp(messageChannel: any): Promise<any> {
    return safeReply(messageChannel, {
      t: '💡 Hướng dẫn sử dụng lệnh solution',
      embed: [
        {
          color: getRandomColor(),
          title: 'DevHelper - Solution Help',
          description: 'Công cụ quản lý giải pháp cho bug:',
          fields: [
            {
              name: '📋 Liệt kê giải pháp theo bug',
              value:
                '*solution list --bug-id=47\n\n' +
                'Hiển thị tất cả giải pháp đã đề xuất cho bug có ID 47.',
            },
            {
              name: '🔍 Xem chi tiết giải pháp',
              value:
                '*solution detail --id=28\n\n' +
                'Hiển thị thông tin chi tiết của giải pháp có ID 28, bao gồm code và mô tả đầy đủ.',
            },
            {
              name: '➕ Thêm giải pháp mới',
              value:
                '*solution create --bug-id=47 --title="Sửa lỗi refresh token"\n\n' +
                'Tham số bắt buộc: `--bug-id` và `--title`',
            },
            {
              name: '✏️ Cập nhật giải pháp',
              value:
                '*solution update --id=28 --title="Tiêu đề mới"\n' +
                '*solution update --id=28 --code="// Code mới đã sửa lỗi"',
            },
            {
              name: '💻 Ví dụ đầy đủ',
              value:
                '*solution create --bug-id=47 --title="Sửa lỗi refresh token" --desc="Mô tả về lỗi" --code="function fix() { ... }"',
            },
            {
              name: '📝 Lưu ý quan trọng',
              value:
                '• Khi tạo giải pháp mới, phải có `--bug-id` và `--title`\n' +
                '• Khi liệt kê giải pháp, phải cung cấp `--bug-id`\n' +
                '• Khi xem chi tiết hoặc cập nhật, phải cung cấp `--id`\n' +
                '• Tạo giải pháp cho bug "open" sẽ tự động đổi trạng thái thành "in_progress"',
            },
          ],
          footer: {
            text: 'Gõ *solution để hiển thị hướng dẫn này',
          },
        },
      ],
    });
  }

  private async handleCreate(
    args: Record<string, string>,
    messageChannel: any,
  ): Promise<any> {
    const { 'bug-id': bugId, title, desc, code } = args;

    if (!bugId || isNaN(parseInt(bugId))) {
      return safeReply(
        messageChannel,
        createReplyOptions(
          '❌ Thiếu thông tin hoặc định dạng không hợp lệ: Vui lòng cung cấp --bug-id (số).',
          createPreMarkdown(
            '❌ Thiếu thông tin hoặc định dạng không hợp lệ: Vui lòng cung cấp --bug-id (số).',
          ),
        ),
      );
    }

    if (!title) {
      return safeReply(
        messageChannel,
        createReplyOptions(
          '❌ Thiếu thông tin: Vui lòng cung cấp --title.',
          createPreMarkdown('❌ Thiếu thông tin: Vui lòng cung cấp --title.'),
        ),
      );
    }

    try {
      const bug = await this.bugService.findById(parseInt(bugId));
      const newSolution = await this.solutionService.create({
        title,
        description: desc || '',
        code: code || '',
        bug: bug,
      });

      if (bug.status === 'open') {
        await this.bugService.update(bug.id, {
          status: BugStatus.IN_PROGRESS,
        });
      }

      return safeReply(
        messageChannel,
        createReplyOptions(
          `✅ Đã thêm giải pháp! ID: ${newSolution.id}\nBug: #${bug.id} - ${bug.title}\n\nSử dụng /solution detail --id=${newSolution.id} để xem chi tiết.`,
          createPreMarkdown(
            `✅ Đã thêm giải pháp! ID: ${newSolution.id}\nBug: #${bug.id} - ${bug.title}\n\nSử dụng /solution detail --id=${newSolution.id} để xem chi tiết.`,
          ),
        ),
      );
    } catch (error) {
      return safeReply(
        messageChannel,
        createReplyOptions(
          `❌ Lỗi: ${error.message}`,
          createPreMarkdown(`❌ Lỗi: ${error.message}`),
        ),
      );
    }
  }

  private async handleList(
    args: Record<string, string>,
    messageChannel: any,
  ): Promise<any> {
    const { 'bug-id': bugId } = args;

    if (!bugId || isNaN(parseInt(bugId))) {
      return safeReply(
        messageChannel,
        createReplyOptions(
          '❌ Thiếu thông tin hoặc định dạng không hợp lệ: Vui lòng cung cấp --bug-id (số).',
          createPreMarkdown(
            '❌ Thiếu thông tin hoặc định dạng không hợp lệ: Vui lòng cung cấp --bug-id (số).',
          ),
        ),
      );
    }

    try {
      const bug = await this.bugService.findById(parseInt(bugId));
      const solutions = await this.solutionService.listByBugId(parseInt(bugId));

      if (solutions.length === 0) {
        const actionRow: ActionRowComponent = {
          type: MessageComponentType.ACTION_ROW,
        } as ActionRowComponent;

        return safeReply(messageChannel, {
          ...createReplyOptions(
            `📋 Không tìm thấy giải pháp nào cho bug #${bugId}: "${bug.title}".\n\nSử dụng /solution create --bug-id=${bugId} để thêm giải pháp.`,
            createPreMarkdown(
              `📋 Không tìm thấy giải pháp nào cho bug #${bugId}: "${bug.title}".\n\nSử dụng /solution create --bug-id=${bugId} để thêm giải pháp.`,
            ),
          ),
          components: [actionRow],
        });
      }

      let listText = `📋 Giải pháp cho bug #${bugId}: "${bug.title}":\n\n`;
      solutions.forEach((solution, index) => {
        listText += `${index + 1}. #${solution.id}: ${solution.title}\n`;
      });
      listText += '\n📌 Các lệnh bạn có thể dùng:\n';
      listText += `• /solution detail --id=${solutions[0].id}    (Xem chi tiết giải pháp)\n`;
      listText += `• /solution update --id=${solutions[0].id}    (Cập nhật giải pháp)\n`;
      listText += `• /solution create --bug-id=${bugId}    (Thêm giải pháp mới)\n`;

      return safeReply(
        messageChannel,
        createReplyOptions(listText, createPreMarkdown(listText)),
      );
    } catch (error) {
      return safeReply(
        messageChannel,
        createReplyOptions(
          `❌ Lỗi: ${error.message}`,
          createPreMarkdown(`❌ Lỗi: ${error.message}`),
        ),
      );
    }
  }

  private async handleDetail(
    args: Record<string, string>,
    messageChannel: any,
  ): Promise<any> {
    const { id } = args;

    if (!id || isNaN(parseInt(id))) {
      return safeReply(
        messageChannel,
        createReplyOptions(
          '❌ Thiếu thông tin hoặc định dạng không hợp lệ: Vui lòng cung cấp --id (số).',
          createPreMarkdown(
            '❌ Thiếu thông tin hoặc định dạng không hợp lệ: Vui lòng cung cấp --id (số).',
          ),
        ),
      );
    }

    try {
      const solution = await this.solutionService.findById(parseInt(id));
      const createdAt = new Date(solution.createdAt);
      const formattedDate = `${createdAt.toLocaleDateString()}, ${createdAt.toLocaleTimeString()}`;
      let codeDisplay = 'Không có code';
      if (solution.code) {
        codeDisplay = `\`\`\`\n${solution.code}\n\`\`\``;
      }

      return safeReply(messageChannel, {
        embed: [
          {
            color: getRandomColor(),
            title: `💡 Giải pháp #${solution.id}: "${solution.title}"`,
            fields: [
              {
                name: 'Cho bug',
                value: `#${solution.bug.id} - ${solution.bug.title}`,
              },
              {
                name: 'Mô tả',
                value: solution.description || 'Không có mô tả',
              },
              {
                name: 'Code',
                value: codeDisplay,
              },
              {
                name: 'Đã tạo',
                value: formattedDate,
              },
            ],
            footer: {
              text: 'DevHelper Bot',
            },
          },
        ],
      });
    } catch (error) {
      return safeReply(
        messageChannel,
        createReplyOptions(
          `❌ Lỗi: ${error.message}`,
          createPreMarkdown(`❌ Lỗi: ${error.message}`),
        ),
      );
    }
  }

  private async handleUpdate(
    args: Record<string, string>,
    messageChannel: any,
  ): Promise<any> {
    const { id, title, desc, code } = args;

    if (!id || isNaN(parseInt(id))) {
      return safeReply(
        messageChannel,
        createReplyOptions(
          '❌ Thiếu thông tin hoặc định dạng không hợp lệ: Vui lòng cung cấp --id (số).',
          createPreMarkdown(
            '❌ Thiếu thông tin hoặc định dạng không hợp lệ: Vui lòng cung cấp --id (số).',
          ),
        ),
      );
    }

    try {
      const existingSolution = await this.solutionService.findById(
        parseInt(id),
      );
      const updateData: any = {};
      if (title) updateData.title = title;
      if (desc !== undefined) updateData.description = desc;
      if (code !== undefined) updateData.code = code;

      if (Object.keys(updateData).length === 0) {
        return safeReply(
          messageChannel,
          createReplyOptions(
            '❌ Không có thông tin nào để cập nhật.',
            createPreMarkdown('❌ Không có thông tin nào để cập nhật.'),
          ),
        );
      }

      await this.solutionService.update(parseInt(id), updateData);
      const updatedSolution = await this.solutionService.findById(parseInt(id));

      let changesText = '';
      for (const key of Object.keys(updateData)) {
        let oldValue = existingSolution[key];
        let newValue = updatedSolution[key];
        if (key === 'code') {
          oldValue = oldValue ? '(có code)' : '(không có code)';
          newValue = newValue ? '(có code mới)' : '(không có code)';
        }
        changesText += `• ${key}: ${oldValue} ➔ ${newValue}\n`;
      }

      return safeReply(
        messageChannel,
        createReplyOptions(
          `✅ Đã cập nhật giải pháp #${id}:\n\n${changesText}\nSử dụng /solution detail --id=${id} để xem chi tiết.`,
          createPreMarkdown(
            `✅ Đã cập nhật giải pháp #${id}:\n\n${changesText}\nSử dụng /solution detail --id=${id} để xem chi tiết.`,
          ),
        ),
      );
    } catch (error) {
      return safeReply(
        messageChannel,
        createReplyOptions(
          `❌ Lỗi: ${error.message}`,
          createPreMarkdown(`❌ Lỗi: ${error.message}`),
        ),
      );
    }
  }
}
