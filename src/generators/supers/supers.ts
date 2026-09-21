import { debug_text_box, startRandomRollPage } from '../../default_main_page';
import { default_build } from './supers_impl';

startRandomRollPage({
  generate: default_build,
  outputRenderer: debug_text_box,
});
