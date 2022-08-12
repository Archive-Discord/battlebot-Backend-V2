import { Error } from '@/interfaces/error.interface';
import { ContainsEmoji } from '@/utils/customValidation';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsHexColor, IsIn, IsOptional, IsPhoneNumber, IsString, Matches, Validate } from 'class-validator';

export class Vote {
    @IsArray({message: "투표 향목은 Array 형식이여야 합니다", context: { errorCode: Error.IS_NOT_ARRAY }})
    @ArrayMinSize(1, {message: "투표 향목을 최소 1가지 이상 입력해주세요", context: { errorCode: Error.IS_NOT_MIN_ARRAY }})
    @ArrayMaxSize(10, {message: "투표 향목은 최대 10가지 입니다", context: { errorCode: Error.IS_NOT_MAX_ARRAY }})
    public voteItems: string[]

    @IsString({message: "투표의 제목을 입력해주세요", context: { errorCode: Error.IS_NOT_TITLE }})
    public voteTitle: string

    @IsString({message: "투표 채널을 선택해주세요", context: { errorCode: Error.IS_NOT_SELECT_CHANNEL }})
    public channel: string;
}

export class Warning {

  @IsString({message: "경고 사유를 입력해주세요", context: { errorCode: Error.IS_NOT_INPUT_REASON }})
  public reason: string
}

export class CustomLink {
  @IsIn(["custom", "random"], {message: "올바른 커스텀 링크의 생성 타입을 입력해주세요", context: { errorCode: Error.IS_NOT_ALLOW_TYPE } })
  @IsString({message: "커스텀 링크의 생성 타입을 입력해주세요", context: { errorCode: Error.IS_NOT_SELECT_TYPE }})
  public type: string

  @IsOptional()
  @IsIn(["kakao", "phone", "email"], {message: "올바른 커스텀 링크의 옵션 타입을 입력해주세요", context: { errorCode: Error.IS_NOT_ALLOW_TYPE } })
  @IsString({message: "커스텀 링크의 옵션 타입을 입력해주세요", context: { errorCode: Error.IS_NOT_SELECT_TYPE }})
  public option?: string;

  @IsOptional()
  @IsString({message: "커스텀 링크는 문자만 입력가능합니다", context: { errorCode: Error.IS_NOT_STRING }})
  public path?: string
}

export class DeleteCustomLink {
  @IsArray({message: "삭제 향목은 Array 형식이여야 합니다", context: { errorCode: Error.IS_NOT_ARRAY }})
  public path: string[]
}

export class Ticket {
  @IsString({message: "티켓 채널을 선택해주세요", context: { errorCode: Error.IS_NOT_SELECT_CHANNEL }})
  public channel: string;

  @IsString({message: "티켓이 생성될 카테고리를 선택해주세요", context: { errorCode: Error.IS_NOT_SELECT_CHANNEL }})
  public categori: string;
  @IsString({message: "티켓의 제목을 입력해주세요", context: { errorCode: Error.IS_NOT_TITLE }})
  public title: string;

  @IsString({message: "티켓의 설명을 입력해주세요", context: { errorCode: Error.IS_NOT_DESCRIPTION }})
  public description: string;

  @IsHexColor({message: "임베드의 올바른 색상을 선택해 주세요"})
  @IsOptional()
  public color: string;

  @Validate(ContainsEmoji, {message: "임베드의 올바른 이모지를 선택해 주세요"})
  @IsOptional()
  public emoji: string;

  @IsString({message: "버튼의 올바른 텍스트를 입력해 주세요"})
  @IsOptional()
  public button: string;
}

export class verifyPhone {
  @Matches(/(^02.{0}|^01.{1}|[0-9]{3})([0-9]+)([0-9]{4})/g, {
    message: "\"01012341234\" 형식의 번호로 작성해주세요"
  })
  phoneNumber: string;

  @IsString({message: "유저 정보는 필수 향목입니다"})
  userId: string;
}