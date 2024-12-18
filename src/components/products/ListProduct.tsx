import Skeleton from "react-loading-skeleton";
import SkeletonWrapper from "../query-wrapper/SkeletonWrapper";
import { ListProductProps, SkeletonCustomProps } from "../types";
import ProductCard from "./ProductCard";

const SkeletonCustom: React.FC<SkeletonCustomProps> = (props) => {
    const {size} = props;
    const components = Array.from({ length: size || 10 }, (_, i) => i + 1);
    return <div className="products">
        {components.map((index) => <Skeleton key={index} className="card-container-size" style={{
            height: "300px"
        }} />)}
    </div>
};

const ListProduct: React.FC<ListProductProps> = (props) => {

    const { products, title, loading, skSize } = props;
    const viewSkeleton = loading ? loading : false;
    return <SkeletonWrapper queriesStatus={[viewSkeleton]} skeleton={<SkeletonCustom size={skSize}/>}>
        <div style={{
            display: 'flex',
            flexDirection: 'column',
        }}>
            {title && <h5>{title}</h5>}
            <div className="products">
                {products?.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
        </div>
      
    </SkeletonWrapper>
};
export default ListProduct;
