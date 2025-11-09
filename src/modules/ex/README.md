# Products 모듈 - CRUD 데코레이터 사용 예제

> @Crud 데코레이터를 사용하는 표준 모듈 구조 및 패턴 예제

## 📋 목차

- [개요](#개요)
- [폴더 구조](#폴더-구조)
- [파일별 설명](#파일별-설명)
- [사용 방법](#사용-방법)
- [API 엔드포인트](#api-엔드포인트)
- [커스터마이징](#커스터마이징)
- [베스트 프랙티스](#베스트-프랙티스)

---

## 개요

### 이 모듈은 무엇인가?

이 모듈은 **@Crud 데코레이터를 사용하는 표준 NestJS 모듈 구조**의 예제입니다.
다른 개발자가 새로운 모듈을 생성할 때 참고할 수 있도록 자세한 주석과 설명이 포함되어 있습니다.

### 주요 특징

- ✅ **@Crud 데코레이터** - 자동 CRUD 엔드포인트 생성 (90% 코드 감소)
- ✅ **파일 기반 Serializer** - 응답 직렬화 중앙 관리
- ✅ **재귀적 직렬화** - 관계 데이터의 민감 정보 자동 제외
- ✅ **JSON:API 1.1 준수** - 표준화된 REST API
- ✅ **관리자/사용자 API 분리** - 권한에 따른 엔드포인트 구분
- ✅ **상세한 주석** - 모든 파일에 학습용 주석 포함

---

## 폴더 구조

```
src/modules/ex/
│
├── 📂 admin/                          # 관리자 전용 컨트롤러
│   └── products.controller.ts        # 모든 CRUD 작업 가능
│
├── 📂 api/                            # 일반 사용자 컨트롤러
│   └── products.controller.ts        # 조회만 가능
│
├── 📂 dto/                            # 데이터 전송 객체
│   ├── create-product.dto.ts         # 생성 DTO (validation 포함)
│   └── update-product.dto.ts         # 수정 DTO (PartialType)
│
├── 📂 test/                           # 테스트 파일 (TODO)
│   ├── 📂 unit/                       # 유닛 테스트
│   └── 📂 e2e/                        # E2E 테스트
│
├── product.entity.ts                  # Prisma 엔티티 타입
├── product.serializer.ts              # 응답 직렬화 규칙
├── products.service.ts                # 비즈니스 로직
├── products.module.ts                 # 모듈 정의 + Serializer 등록
└── README.md                          # 이 파일
```

---

## 파일별 설명

### 1. product.entity.ts

**역할**: Prisma에서 자동 생성된 타입을 재사용

```typescript
import { Product as PrismaProduct } from '@prisma/client';

export type Product = PrismaProduct;
```

**설명**:
- Prisma Client가 schema.prisma를 기반으로 생성한 타입
- 타입 안정성 보장 (컴파일 타임 오류 감지)
- 응답 직렬화는 ProductSerializer에서 처리 (deletedAt 자동 제외)

**왜 `Omit<Product, 'deletedAt'>` 같은 타입이 불필요한가?**
- ✅ ProductSerializer가 런타임에 deletedAt 자동 제외
- ✅ 직렬화 로직은 한 곳(Serializer)에서만 관리 (단일 진실 공급원)
- ❌ 타입 레벨에서 제외하면 중복 정의 및 혼란 초래

---

### 2. product.serializer.ts

**역할**: 응답 직렬화 규칙 정의 (파일 기반 Serializer)

```typescript
export class ProductSerializer extends BaseSerializer<Product> {
  protected excludeFields = ['deletedAt'];
  protected relations = {};
  protected transform(data: Partial<Product>) {
    return data;
  }
}
```

**설명**:
- `excludeFields`: 응답에서 제외할 필드 (deletedAt 등)
- `relations`: 관계 데이터 재귀적 직렬화 매핑
- `transform()`: 커스텀 변환 로직 (formattedPrice 추가 등)

**적용 방법** (자동 등록 ⭐):
1. `ProductsService` 생성 시 `config.serializer`로 전달
2. `CrudBaseService`가 자동으로 SerializerRegistry에 등록
3. 모든 API 응답에 자동 적용

**더 이상 모듈의 `onModuleInit()`에서 수동 등록할 필요 없음!**

---

### 3. dto/create-product.dto.ts

**역할**: Product 생성 시 입력 검증

```typescript
export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(0)
  stock: number;

  // ... 기타 필드
}
```

**설명**:
- `class-validator` 데코레이터로 자동 검증
- JSON:API 요청 → middleware가 변환 → DTO로 매핑
- 검증 실패 시 400 Bad Request 자동 반환

---

### 4. dto/update-product.dto.ts

**역할**: Product 수정 시 입력 검증 (모든 필드 선택사항)

```typescript
export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

**설명**:
- `PartialType`: CreateProductDto의 모든 필드를 optional로 변경
- 전송된 필드만 업데이트됨
- validation은 전송된 필드에만 적용

---

### 5. products.service.ts

**역할**: 비즈니스 로직 구현

```typescript
@Injectable()
export class ProductsService extends CrudBaseService<Product> {
  constructor(prisma: PrismaService) {
    super(prisma, 'product', {
      serializer: new ProductSerializer(),  // ⭐ 자동 등록됨!
      allowedIncludes: [],
      allowedFilters: { /* ... */ },
      allowedSorts: [ /* ... */ ],
      performance: {
        query: { eagerLoad: true },
      },
    });
  }

  // 커스텀 메서드
  async findBySlug(slug: string): Promise<Product> { /* ... */ }
  async findByCategory(category: string): Promise<Product[]> { /* ... */ }
  async findLowStock(threshold: number): Promise<Product[]> { /* ... */ }
  async searchProducts(keyword: string): Promise<Product[]> { /* ... */ }
}
```

**설명**:
- `CrudBaseService` 상속으로 기본 CRUD 자동 구현
  - `findAll()`: 필터링, 정렬, 페이지네이션 지원
  - `findOne(id)`: 단일 조회
  - `create(data)`: 생성
  - `update(id, data)`: 수정
  - `remove(id)`: 삭제 (Soft Delete 지원)
- 커스텀 메서드 추가 가능

---

### 6. api/products.controller.ts (일반 사용자 API)

**역할**: 일반 사용자 API 엔드포인트 (조회만)

```typescript
@Crud({
  only: [CrudOperation.Index, CrudOperation.Show],
  resourceType: 'products',
  allowedFilters: { /* 제한된 필터 */ },
  allowedSorts: ['createdAt', 'price', 'name'],
  pagination: { defaultLimit: 20, limit: 100 },
})
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}
}
```

**생성되는 엔드포인트**:
- `GET /api/products` - 목록 조회
- `GET /api/products/:id` - 단일 조회

---

### 7. admin/products.controller.ts (관리자 API)

**역할**: 관리자 전용 API 엔드포인트 (전체 CRUD)

```typescript
@Crud({
  only: [
    CrudOperation.Index,
    CrudOperation.Show,
    CrudOperation.Create,
    CrudOperation.Update,
    CrudOperation.Delete,
  ],
  resourceType: 'products',
  allowedFilters: { /* 모든 필터 */ },
  pagination: { defaultLimit: 50, limit: 500 },
  allowedParams: { /* 생성/수정 허용 필드 */ },
})
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}
}
```

**생성되는 엔드포인트**:
- `GET /admin/products` - 목록 조회 (모든 상품)
- `GET /admin/products/:id` - 단일 조회
- `POST /admin/products` - 생성
- `PATCH /admin/products/:id` - 수정
- `DELETE /admin/products/:id` - 삭제

---

### 8. products.module.ts

**역할**: NestJS 모듈 정의 (Serializer 자동 등록 ⭐)

```typescript
@Module({
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {
  /**
   * Serializer 자동 등록 ⭐
   *
   * ProductsService 생성 시 ProductSerializer가 SerializerRegistry에 자동 등록됩니다.
   * 더 이상 onModuleInit()에서 수동 등록할 필요 없습니다!
   */
}
```

**설명**:
- `controllers`: API 엔드포인트 등록
- `providers`: 서비스 등록 (의존성 주입)
- `exports`: 다른 모듈에서 사용 가능하도록 공개
- **Serializer 자동 등록** ⭐: ProductsService에서 `config.serializer`로 전달하면 자동 등록됨
- `OnModuleInit` 인터페이스 구현 불필요 (코드 간소화!)

---

## 사용 방법

### Step 1: Prisma 스키마에 모델 추가 (이미 완료)

```prisma
// prisma/schema.prisma
model Product {
  id          String    @id @default(uuid())
  name        String
  slug        String    @unique
  description String?
  price       Decimal   @db.Decimal(10, 2)
  stock       Int       @default(0)
  category    String
  isActive    Boolean   @default(true)
  tags        String[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  @@map("products")
  @@index([slug])
  @@index([category])
  @@index([isActive])
  @@index([createdAt])
}
```

### Step 2: 마이그레이션 실행

```bash
# Prisma Client 재생성 + 마이그레이션
pnpm prisma:migrate

# 또는 개발 환경에서 빠르게 적용
pnpm db:push
```

### Step 3: AppModule에 등록

```typescript
// src/app.module.ts
import { ProductsModule } from './modules/ex/products.module';

@Module({
  imports: [
    // ...
    ProductsModule, // ← 추가
  ],
})
export class AppModule {}
```

### Step 4: 서버 시작 및 API 테스트

```bash
# 개발 서버 시작
pnpm start:dev

# API 테스트
curl http://localhost:3000/api/products
```

---

## API 엔드포인트

### 일반 사용자 API

#### 1. 목록 조회 (필터링, 정렬, 페이지네이션)

```bash
# 기본 조회
GET /api/products

# 카테고리 필터링
GET /api/products?filter[category][eq]=electronics

# 가격 범위 필터링
GET /api/products?filter[price][gte]=1000000&filter[price][lte]=2000000

# 이름 검색
GET /api/products?filter[name][like]=노트북

# 정렬 (가격 높은순)
GET /api/products?sort=-price

# 페이지네이션
GET /api/products?page[number]=2&page[size]=20

# 복합 쿼리
GET /api/products?filter[category][eq]=electronics&sort=-createdAt&page[number]=1&page[size]=10
```

#### 2. 단일 조회

```bash
GET /api/products/123
```

### 관리자 API

#### 1. 상품 생성

```bash
POST /admin/products
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "products",
    "attributes": {
      "name": "MacBook Pro 16-inch",
      "slug": "macbook-pro-16-inch-2024",
      "description": "Apple M2 Max 칩, 16GB RAM, 512GB SSD 탑재",
      "price": 3500000,
      "stock": 10,
      "category": "electronics",
      "isActive": true,
      "tags": ["노트북", "Apple", "M2"]
    }
  }
}
```

#### 2. 상품 수정

```bash
PATCH /admin/products/123
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "products",
    "id": "123",
    "attributes": {
      "price": 3200000,
      "stock": 5
    }
  }
}
```

#### 3. 상품 삭제 (Soft Delete)

```bash
DELETE /admin/products/123
```

---

## 커스터마이징

### 1. 새로운 필터 추가

```typescript
// products.service.ts
super(prisma, 'product', {
  allowedFilters: {
    // ...기존 필터
    brand: ['eq', 'in'], // ← 추가
  },
});

// api/products.controller.ts
@Crud({
  allowedFilters: {
    // ...기존 필터
    brand: ['eq'], // ← 추가 (일반 사용자는 eq만)
  },
})
```

### 2. 커스텀 엔드포인트 추가

```typescript
// api/products.controller.ts
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // 슬러그로 조회
  @Get('by-slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  // 카테고리별 조회
  @Get('category/:category')
  async findByCategory(@Param('category') category: string) {
    return this.productsService.findByCategory(category);
  }

  // 재고 부족 상품
  @Get('low-stock')
  async findLowStock(@Query('threshold') threshold?: number) {
    return this.productsService.findLowStock(threshold || 5);
  }

  // 검색
  @Get('search')
  async search(@Query('q') keyword: string) {
    return this.productsService.searchProducts(keyword);
  }
}
```

### 3. 응답 필드 추가 (Serializer 커스터마이징)

```typescript
// product.serializer.ts
export class ProductSerializer extends BaseSerializer<Product> {
  protected excludeFields = ['deletedAt'];

  // 추가 필드 계산
  protected transform(data: Partial<Product>): Partial<Product> {
    return {
      ...data,
      // 가격 포맷팅
      formattedPrice: this.formatCurrency(data.price),
      // 재고 상태
      stockStatus: this.getStockStatus(data.stock),
      // 할인가 계산
      discountPrice: this.calculateDiscount(data.price, 0.1),
    };
  }

  private formatCurrency(price?: number): string | undefined {
    if (!price) return undefined;
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price);
  }

  private getStockStatus(stock?: number): string | undefined {
    if (stock === undefined) return undefined;
    if (stock === 0) return 'out_of_stock';
    if (stock < 5) return 'low_stock';
    return 'in_stock';
  }

  private calculateDiscount(price?: number, rate: number = 0.1): number | undefined {
    if (!price) return undefined;
    return Math.round(price * (1 - rate));
  }
}
```

### 4. 관계 추가

```prisma
// 1. Prisma 스키마에 관계 추가
model Product {
  id         String    @id @default(uuid())
  // ... 기존 필드
  categoryId String
  category   Category  @relation(fields: [categoryId], references: [id])
}

model Category {
  id       String    @id @default(uuid())
  name     String
  products Product[]
}
```

```typescript
// 2. Serializer에 관계 매핑 추가
export class ProductSerializer extends BaseSerializer<Product> {
  protected excludeFields = ['deletedAt'];
  protected relations = {
    category: 'category', // Category 직렬화 자동 적용
  };
}

// 3. Service 설정 업데이트
super(prisma, 'product', {
  allowedIncludes: ['category'], // ← 추가
  // ...
});

// 4. Controller 설정 업데이트
@Crud({
  allowedIncludes: ['category'], // ← 추가
  // ...
})
```

---

## 베스트 프랙티스

### 1. 필터링

```typescript
// ✅ 좋은 예: 필요한 연산자만 허용
allowedFilters: {
  category: ['eq', 'in'],  // 카테고리는 정확 일치나 배열만
  price: ['gte', 'lte'],   // 가격은 범위만
}

// ❌ 나쁜 예: 불필요한 연산자까지 허용
allowedFilters: {
  category: ['eq', 'ne', 'gt', 'lt', 'like'],  // 카테고리에 like?
}
```

### 2. 페이지네이션

```typescript
// ✅ 좋은 예: 적절한 제한값 설정
pagination: {
  defaultLimit: 20,   // 기본: 20개
  limit: 100,         // 최대: 100개 (성능 고려)
}

// ❌ 나쁜 예: 제한값 없음 (성능 문제)
pagination: {
  defaultLimit: 100,
  limit: 10000,       // 너무 큼!
}
```

### 3. 민감 정보 제외

```typescript
// ✅ 좋은 예: Serializer에서 제외
export class ProductSerializer extends BaseSerializer<Product> {
  protected excludeFields = ['deletedAt', 'costPrice', 'supplierInfo'];
}

// ❌ 나쁜 예: Controller마다 수동으로 제외
@Crud({
  serialize: {
    exclude: ['deletedAt'],  // Controller마다 중복 정의
  },
})
```

### 4. 에러 처리

```typescript
// ✅ 좋은 예: 명확한 에러 메시지
async findBySlug(slug: string): Promise<Product> {
  const product = await this.model.findUnique({ where: { slug } });
  if (!product) {
    throw new NotFoundException(`상품(slug: ${slug})을 찾을 수 없습니다.`);
  }
  return this.serialize(product);
}

// ❌ 나쁜 예: 모호한 에러
async findBySlug(slug: string): Promise<Product> {
  const product = await this.model.findUnique({ where: { slug } });
  if (!product) throw new Error('Not found');  // 어떤 상품?
  return product;
}
```

### 5. 테스트 작성

```typescript
// ✅ 좋은 예: 모든 서비스 메서드 테스트
describe('ProductsService', () => {
  describe('findBySlug', () => {
    it('슬러그로 상품을 찾아야 함', async () => { /* ... */ });
    it('존재하지 않으면 NotFoundException을 던져야 함', async () => { /* ... */ });
  });

  describe('findByCategory', () => {
    it('카테고리별 상품을 조회해야 함', async () => { /* ... */ });
    it('활성 상품만 반환해야 함', async () => { /* ... */ });
  });
});

// ❌ 나쁜 예: 테스트 없음
```

---

## 참고 자료

### 프로젝트 문서
- [README.md](../../README.md) - 프로젝트 전체 가이드
- [CRUD_DECORATOR_GUIDE.md](../../docs/CRUD_DECORATOR_GUIDE.md) - @Crud 데코레이터 상세 가이드
- [FILE_BASED_SERIALIZER.md](../../docs/FILE_BASED_SERIALIZER.md) - 파일 기반 Serializer 가이드
- [RECURSIVE_SERIALIZATION.md](../../docs/RECURSIVE_SERIALIZATION.md) - 재귀적 직렬화 가이드

### 외부 문서
- [NestJS 공식 문서](https://docs.nestjs.com/)
- [Prisma 공식 문서](https://www.prisma.io/docs)
- [JSON:API 스펙](https://jsonapi.org/format/1.1/)

---

**작성일**: 2025-11-09
**작성자**: Claude Code
**버전**: 1.0.0
