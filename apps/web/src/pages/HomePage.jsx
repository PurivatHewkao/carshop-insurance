import design from '../design/toyoty.json';
import {
  Action,
  CarGrid,
  CarImage,
  Specs,
} from '../components/common/Showroom.jsx';
const blocks = design.roles[0].pages[0].blocks;
export default function HomePage() {
  const [hero, specs, cars, promos, features, cta] = blocks;
  return (
    <>
      <section className="s-hero">
        <div className="s-hero-bg" />
        <div>
          <p className="s-eyebrow on-dark">{hero.eyebrow}</p>
          <h1>{hero.title}</h1>
          <p className="s-hero-sub">{hero.sub}</p>
          <p className="s-hero-price">{hero.price}</p>
          <div className="s-actions">
            <Action to="/requests?type=จอง">{hero.btn1}</Action>
            <Action variant="glass" to="/requests?type=นัดดูรถ">
              {hero.btn2}
            </Action>
          </div>
        </div>
        <div className="s-hero-car">
          <CarImage {...hero.car} />
        </div>
      </section>
      <div className="spec-strip">
        <Specs items={specs.items} />
      </div>
      <div className="page-content home-content">
        <CarGrid {...cars} />
        <section id="promotions">
          <div className="s-sec-h">
            <h2>{promos.title}</h2>
          </div>
          <div className="s-promos">
            {promos.items.map((item, i) => (
              <article className={'s-promo k' + i} key={item.big}>
                <span className="tag">{item.tag}</span>
                <div className="big">{item.big}</div>
                <h3>{item.a}</h3>
                <p>{item.b}</p>
                <Action
                  variant={i < 2 ? 'glass' : 'out'}
                  to="/requests?type=สนใจ"
                >
                  สอบถามโปรโมชัน →
                </Action>
              </article>
            ))}
          </div>
        </section>
        <section className="s-feats" id="services">
          {features.items.map((item, i) => (
            <article className="s-feat" key={item.a}>
              <span className="ic-b" aria-hidden="true">
                {['◇', '◷', '✓'][i]}
              </span>
              <h3>{item.a}</h3>
              <p>{item.b}</p>
            </article>
          ))}
        </section>
        <section className="s-cta" id="insurance">
          <div>
            <h2>{cta.title}</h2>
            <p>{cta.body}</p>
          </div>
          <Action variant="light" to="/requests?type=จอง">
            {cta.btn}
          </Action>
        </section>
      </div>
    </>
  );
}
