import { Routes } from '@angular/router';
import { Homepage } from './homepage/homepage';
import { Listproduct } from './listproduct/listproduct';
import { ProductDetail } from './product-detail/product-detail';
import { Cart } from './cart/cart';
import { Listblog } from './listblog/listblog';
import { BlogDetail } from './blog-detail/blog-detail';
import { BlogCategory } from './blog-category/blog-category';
import { Listdiseases } from './listdiseases/listdiseases';
import { DiseaseDetail } from './disease-detail/disease-detail';
import { BrandDetail } from './brand-detail/brand-detail';
import { Payment } from './payment/payment';
import { OrderSuccess } from './order-success/order-success';
import { QrPayment } from './qr-payment/qr-payment';
import { Order } from './order/order';
import { ProfileLayout } from './profile-layout/profile-layout';
import { ClientInfor } from './client-infor/client-infor';
import { Address } from './address/address';
import { MyOrder } from './myorder/myorder';
import { CardPayment } from './card-payment/card-payment';
import { MomoPayment } from './momo-payment/momo-payment';
import { DrugSearch } from './drug-search/drug-search';
import { ActiveIngredientSearch } from './active-ingredient-search/active-ingredient-search';
import { HerbalMedicineSearch } from './herbal-medicine-search/herbal-medicine-search';
import { PharmacistChat } from './pharmacist-chat/pharmacist-chat';
import { MedicineRequest } from './medicine-request/medicine-request';

export const routes: Routes = [
  { path: '', component: Homepage },
  { path: 'products', component: Listproduct },
  { path: 'category/:slug', component: Listproduct }, // Dynamic category route
  { path: 'product/:id', component: ProductDetail },
  { path: 'cart', component: Cart },
  { path: 'blogs/category/:slug', component: BlogCategory },
  { path: 'blogs', component: Listblog },
  { path: 'blog/:slug', component: BlogDetail },
  { path: 'brand/:slug', component: BrandDetail },
  { path: 'diseases', component: Listdiseases },
  { path: 'disease/:id', component: DiseaseDetail },
  { path: 'thuoc/tra-cuu-thuoc', component: DrugSearch },
  { path: 'drug-search', component: DrugSearch },
  { path: 'duoc-chat', component: ActiveIngredientSearch },
  { path: 'duoc-chat/:slug', component: Listproduct }, // Show products containing this ingredient
  { path: 'duoc-lieu', component: HerbalMedicineSearch },
  { path: 'duoc-lieu/:slug', component: Listproduct }, // Show products containing this herbal medicine
  { path: 'pharmacist-chat', component: PharmacistChat },
  { path: 'medicine-request', component: MedicineRequest },
  { path: 'payment', component: Payment },
  { path: 'qr-payment', component: QrPayment },
  { path: 'card-payment', component: CardPayment },
  { path: 'momo-payment', component: MomoPayment },
  { path: 'order-success', component: OrderSuccess },
  { path: 'order/:id', component: Order },
  {
    path: 'profile',
    component: ProfileLayout,
    children: [
      { path: '', redirectTo: 'info', pathMatch: 'full' },
      { path: 'info', component: ClientInfor },
      { path: 'orders', component: MyOrder },
      { path: 'addresses', component: Address }
    ]
  },
  { path: '**', redirectTo: '' }
];
